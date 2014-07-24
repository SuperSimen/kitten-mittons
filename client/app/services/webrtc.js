(function () {

	app.factory('webrtc', function(constants, model, $rootScope, $sce, xmpp, $timeout, utility) {
		var webrtc = {};
		var config = {
			iceServers: constants.iceServers
		};


		webrtc.init = function() {
			xmpp.addHandler(handleOffer, constants.xmpp.webrtc, "message", "offer");
			xmpp.addHandler(handleWebrtc, constants.xmpp.webrtc, "message");
		};

		function handleWebrtc(stanza) {
			return true;
		}
			
		function getUserMedia(callback) {
			if (model.video.local.stream) {
				callback(model.video.local.stream);
				return;
			}

			try {
				var currentCall = model.call.getCurrent();
				navigator.webkitGetUserMedia({
					video: currentCall.video,
					audio: currentCall.audio
				},
				function(stream) {
					model.video.local.src = $sce.trustAsResourceUrl(URL.createObjectURL(stream));
					model.video.local.stream = stream;
					callback(stream);
				}, function() {
					console.error(arguments);
				});
			}
			catch (err) {
				console.log(err);
				reset();
			}

		}


		webrtc.call = function (to) {
			if (!model.video.active) {
				model.video.remote.userId = utility.getIdFromJid(to);
				videoCall(to);
			}
			else {
				console.log("call already active");
			}
		};

		function reset() {
			if (model.video.active) {
				video.close();
			}
			model.video.remote.src = "";
			model.video.remote.userId = "";
			model.video.active = false;
			if (model.video.local.stream) {
				model.video.local.stream.stop();
				model.video.local.stream = null;
			}
			model.call.status = "free";
			model.call.deleteCurrent();
		}

		webrtc.hangup = function() { 
			reset();
		};

		webrtc.enableVideo = function(enable) {
			video.enableVideo(enable);

		};
		webrtc.enableAudio = function(enable) {
			video.enableAudio(enable);
		};

		var video = {
			stream: null,
			setPeerConnection: function(peerConnection) {
				console.log("setting peer connection");
				peerConnection.oniceconnectionstatechange = this.onIceChange;
				this.stream = peerConnection.getLocalStreams()[0];
				this.peerConnection = peerConnection;
			},
			peerConnection: null,
			onIceChange: function (event) {
				switch (event.target.iceConnectionState) {
					case "disconnected":
					case "closed":
						$rootScope.$apply(function() {
							reset();
						});
				}
			},
			close: function() {
				if (this.peerConnection) {
					this.peerConnection.close();
					this.peerConnection = null;
				}
			},
			enableVideo: function(enable) {
				if (this.stream) {
					this.stream.getVideoTracks()[0].enabled = enable;
				}
			},
			enableAudio: function(enable) {
				if (this.stream) {
					this.stream.getAudioTracks()[0].enabled = enable;
				}
			}

		};


		function videoCall (to) {
			console.log("video call");
			getUserMedia(continueCall);

			function continueCall (stream) {
				var peerConnection = new webkitRTCPeerConnection(config);
				peerConnection.addStream(stream);
				video.setPeerConnection(peerConnection);

				var id = peerConnections.add(peerConnection, to);

				peerConnection.createOffer(createOffer(function(desc) {
					peerConnection.setLocalDescription(desc);
					var offer = $msg({to: to, type: "offer", id: id})
					.c("x", {xmlns: constants.xmpp.webrtc, type: "video"}).up()
					.c("desc").t(JSON.stringify(desc));
					xmpp.send(offer);
				}));
			}
		}

		var peerConnections = {
			list: {},
			counter: 0,
			add: function(peerConnection, to, id) {
				if (!id) {
					id = this.generateRandomId();
				}

				if (this.list[id]) {
					console.error("random id is not random");
					return;
				}

				var iceCandidates = this.createIceCandidates(to, id);

				this.list[id] = {
					peerConnection: peerConnection,
					iceCandidates: iceCandidates
				};

				peerConnection.onicecandidate = function(event) {
					if (event.candidate) {
						iceCandidates.addIceCandidate(event.candidate);
					}
				};
				peerConnection.onaddstream = onAddStream;

				function answerHandlerCallback () {
					iceCandidates.setReadyToSend(true);
				}
				peerConnection.ondatachannel = function(event) {
					var dataChannel = event.channel;

					dataSenders.getSender(to, true).addDataChannel(dataChannel);
					dataSenders.getSender(to, true).addPeerConnection(dataChannel);

				};

				xmpp.addHandler(this.createAnswerHandler(peerConnection, answerHandlerCallback), constants.xmpp.webrtc, "message", "answer", id);
				xmpp.addHandler(this.createIceHandler(peerConnection), constants.xmpp.webrtc, "message", "iceCandidate", id);


				return id;
			},

			createIceCandidates: function(to, id) {
				return {
					list: [],
					readyToSend: false,
					setReadyToSend: function(ready) {
						this.readyToSend = ready;
						if (ready && this.list.length) {
							this.sendAndEmptyIceCandidates();
						}
					},
					addIceCandidate: function (candidate) {
						this.list.push(candidate);
						if (this.readyToSend) {
							this.sendAndEmptyIceCandidates();
						}
					},
					sendAndEmptyIceCandidates: function() {
						if (!to) {
							console.error("SENDING TO WHOM=!? WHAT??!!");
							return;
						}
						for (var i in this.list) {
							var iceCandidate = $msg({to: to, type: "iceCandidate", id: id})
							.c("x", {xmlns: constants.xmpp.webrtc}).up()
							.c("desc").t(JSON.stringify(this.list[i]));
							xmpp.send(iceCandidate);
						}
						this.list.length = 0;
					}

				};

			},
			get: function(id) {
				return this.list[id].peerConnection;
			},
			getIceCandidates: function(id) {
				return this.list[id].iceCandidates;
			},
			generateRandomId: function() {
				var me = model.user.info.xmpp.jid;
				var userid = utility.getIdFromJid(me);
				var randomId = userid + " - " + utility.randomString() + "-" + this.counter++;
				return randomId;
			},
			createAnswerHandler: function (peerConnection, callback) {
				return function(data) {
					var desc = JSON.parse(data.getChildrenByTagName("desc")[0].children[0].data);

					var from = data.from;
					peerConnection.setRemoteDescription(
						new RTCSessionDescription(desc), 
						function() {},
						function(err) {
							console.log(err);
						}
					);
					callback();
				};
			},
			createIceHandler: function (peerConnection) {
				return function (data) {
					if (!peerConnection) {
						console.error("received unwanted iceCandidate");
						return;
					}
					var candidate = data.getChildrenByTagName("desc")[0].children[0].data;
					var ice = new RTCIceCandidate(JSON.parse(candidate));
					peerConnection.addIceCandidate(ice, function() {
					},
					function(err) {
						console.log(err);
					});
				};
			}
		};

		function handleOffer (data) {
			var from = data.from;
			var desc = JSON.parse(data.getChildrenByTagName("desc")[0].children[0].data);
			var id = data.id;
			if (!id) {
				console.error("no id, something's wrong");
				return;
			}

			var type = data.getChildrenByTagName("x")[0].type;
			if (type === "video" && model.call.currentId !== utility.getIdFromJid(data.from) && model.call.status === "accept") {
				console.log(data.from);
				return console.log("already video call");
			}

			var peerConnection = new webkitRTCPeerConnection(config);
			peerConnections.add(peerConnection, from, id);

			if (type === "video") {
				model.video.active = true;

				getUserMedia(continueOfferHandling);
				model.video.remote.userId = utility.getIdFromJid(from);
			}
			else {
				continueOfferHandling(null);
			}

			function continueOfferHandling(stream) {
				if (stream) {
					peerConnection.addStream(stream);
					video.setPeerConnection(peerConnection);
				}
				peerConnection.setRemoteDescription(new RTCSessionDescription(desc), function() {},
				function(err) {
					console.log(err);
				});

				peerConnection.createAnswer(createAnswer(function(desc) {
					peerConnection.setLocalDescription(desc);
					var answer = $msg({to: from, type: "answer", id: id})
					.c("x", {xmlns: constants.xmpp.webrtc}).up()
					.c("desc").t(JSON.stringify(desc));
					xmpp.send(answer);
				}, function() {console.error(arguments);}));

				peerConnections.getIceCandidates(id).setReadyToSend(true);
			}
		}



		function createOffer(callback){
			return function(desc) {
				callback(desc);
			};
		}

		function createAnswer(callback){
			return function(desc) {
				callback(desc);
			};
		}

		function onAddStream (e){
			$rootScope.$apply(function() {
				model.video.active = true;
				model.call.status = "in-call";
				console.log(e.stream);
				model.video.remote.src = $sce.trustAsResourceUrl(URL.createObjectURL(e.stream));
			});
		}


		var dataSenders = {
			list: {},
			counter: 0,
			getSender: function(to, getActualSender, type, statusCallback) {
				if (!this.list[to]) {
					this.list[to] = this.createSenderObject(to);
				}

				if (getActualSender) {
					return this.list[to];
				}
				else {
					var id = utility.randomString() + this.counter++;
					this.list[to].addInstance(id, function() {
						if (statusCallback) {
							statusCallback("failed");
						}
					});
					return {
						send: function(object, priority) {
							dataSenders.list[to].sendObject(object, type, statusCallback, priority);
						},
						finished: function() {
							dataSenders.list[to].removeInstance(id);
							if (dataSenders.list[to].instances.length === 0) {
								dataSenders.list[to].clean(function() {
									if (dataSenders.list[to]) {
										//delete dataSenders.list[to];
									}
								});
							}
						}
					};
				}
			},
			createSenderObject: function(to) {
				return {	
					dataChannels: [],
					currentChannel: 0,
					queue: [],
					instances: [],
					sendingData: false,
					listOfPeerConnections: [],
					failedTimeout: null,
					failed: false,
					addPeerConnection: function(peerConnection) {
						this.listOfPeerConnections.push(peerConnection);
					},
					readyToCreatePeerConnection: true,
					newPeerConnection: function(callback) {
						if (!this.readyToCreatePeerConnection) {
							$timeout(callback, 100);
							return;
						}

						dataSenders.list[to].readyToCreatePeerConnection = false;
						this.timeoutPromise = $timeout(function() {
							if (dataSenders.list[to]) {
								dataSenders.list[to].readyToCreatePeerConnection = true;
							}
						}, 10000);

						var peerConnection = new webkitRTCPeerConnection(config);
						var id = peerConnections.add(peerConnection, to);

						var dataChannel = peerConnection.createDataChannel("channel", {
							ordered: false
						}); 


						this.addPeerConnection(peerConnection);
						this.addDataChannel(dataChannel);

						peerConnection.createOffer(createOffer(function(desc) {
							peerConnection.setLocalDescription(desc);
							var offer = $msg({to: to, type: "offer", id: id})
							.c("x", {xmlns: constants.xmpp.webrtc, type: "data"}).up()
							.c("desc").t(JSON.stringify(desc));
							xmpp.send(offer);
						}));


						if (callback) {
							$timeout(callback, 100);
						}
					},
					clean: function(callback) {

						while (this.listOfPeerConnections.length) {
							this.listOfPeerConnections[0].close();
							this.listOfPeerConnections.shift();
						}

						this.currentChannel = 0;

						if (callback) callback();
					},
					removeInstance: function(id) {
						for (var i in this.instances) {
							if (this.instances[i].id === id) {
								this.instances.splice(i,1);
								return;
							}
						}
						console.log("could not find and delete fileId");
					},
					addInstance: function(id, failedCallback) {
						this.instances.push({
							id: id,
							failedCallback: failedCallback
						});
					},
					addDataChannel: function(dataChannel) {

						dataChannel.onerror = function (error) {
							console.log("Data Channel Error:", error);
						};
						dataChannel.onmessage = messageHandlers.mainHandler(to);
						dataChannel.onopen = function () {
							dataSenders.list[to].dataChannels.push(dataChannel);
						};
						dataChannel.onclose = function () {
							if (dataSenders.list[to]) {
								dataSenders.list[to].removeDataChannel(dataChannel);
							}
						};

					},
					removeDataChannel: function(dataChannel) {
						for (var i in this.dataChannels) {
							if (this.dataChannels[i] === dataChannel) {
								this.dataChannels.splice(i,1);
								return;
							}
						}
						console.log("could not find datachannel");
					},
					incrementCurrentChannel: function() {
						if (++this.currentChannel >= this.dataChannels.length) {
							this.currentChannel = 0;
						}
					},
					sendOnAvailableChannel: function(object) {
						var counter = 0;
						while (counter++ < this.dataChannels.length) {
							try {
								var message = JSON.stringify(object.msg);
								this.dataChannels[this.currentChannel].send(message);
								if (object.callback) {
									object.callback("sent");
								}
								return true;
							}
							catch (err) {
							}
							this.incrementCurrentChannel();
						}
						return false;
					},
					sendObject: function(object, type, callback, priority) {
						this.addToQueue({
							msg: {
								data: object,
								type: type,
							},
							callback: callback
						}, priority);
					},
					addToQueue: function(data, priority) {
						if (false) {
							this.queue.unshift(data);
						}
						else {
							this.queue.push(data);
						}
						if (!this.sendingData) {
							this.sendingData = true;
							this.restartDataSender();
						}
					},
					sender: function() {
						if (this.dataChannels.length) {
							while(this.queue.length) {
								var success = this.sendOnAvailableChannel(this.queue[0]);
								if (!success) {
									if (this.dataChannels.length < 5) {
										this.newPeerConnection(this.restartDataSender);
									}
									else {
										$timeout(this.restartDataSender, 100);
									}

									return;
								}
								else {
									this.queue.shift();

									if (this.failedTimeout) {
										$timeout.cancel(this.failedTimeout);
									}
									if (this.queue.length) {
										this.failedTimeout = $timeout(this.cancelDataSending, 10000);
									}
								}
							}
							this.sendingData = false;

						}
						else if(!this.listOfPeerConnections.length) {
							this.newPeerConnection(this.restartDataSender);
						}
						else {
							$timeout(this.restartDataSender, 1000);
						}

					},
					restartDataSender: function() {
						dataSenders.list[to].sender();
					},
					cancelDataSending: function() {
						var instances = dataSenders.list[to].instances;
						for (var i = 0; i < instances.length; i++) {
							instances[i].failedCallback();
						}
						dataSenders.list[to].clean();
						dataSenders.list[to].queue.length = 0;
					}
				};

			}
		};

		webrtc.getFileSender = function(to, type, statusCallback) {

			return dataSenders.getSender(to, false, type, statusCallback);
		};

		var messageHandlers = {
			list: {},
			mainHandler: function(from) {
				return function(event) {
					var message = JSON.parse(event.data);
					var data = message.data;

					if (message.type && messageHandlers.list[message.type]) {
						messageHandlers.list[message.type](data, from);
						return;
					}
					else {
						console.log("hot message");
						console.log(event.data);
					}
				};
			},

			addHandler: function(handler, type) {
				this.list[type] = handler;
			}
		};

		webrtc.addMessageHandler = function(handler, type) {
			messageHandlers.addHandler(handler, type);
		};



		return webrtc;



	});


})();
