(function () {

	app.factory('webrtc', function(constants, model, $rootScope, $sce, xmpp, $timeout) {
		var webrtc = {};
		var config = {
			iceServers: constants.iceServers
		};

		var userMediaOptions = {
			audio: false,
			video: true
		};

		webrtc.init = function() {
			xmpp.addHandler(handleOffer, constants.xmpp.webrtc, "message", "offer");
			xmpp.addHandler(handleWebrtc, constants.xmpp.webrtc, "message");
		};

		function handleWebrtc(stanza) {
			return true;
		}
			
		var localStream;	
		function getUserMedia(callback) {
			if (localStream) {
				return localStream;
			}

			navigator.webkitGetUserMedia(userMediaOptions,
				function(stream) {
					localStream = stream;
					callback(stream);
				}, function() {
					console.log(arguments);
				}
			);
		}

		webrtc.call = function (to) {
			videoCall(to);
		};

		function videoCall (to) {
			getUserMedia(continueCall);

			function continueCall (stream) {
				var peerConnection = new webkitRTCPeerConnection(config);

				var id = peerConnections.add(peerConnection, to);

				peerConnection.createOffer(createOffer(function(desc) {
					peerConnection.setLocalDescription(desc);
					console.log(desc);
					var offer = $msg({to: to, type: "offer", id: id})
					.c("x", {xmlns: constants.xmpp.webrtc, type: "video"}).up()
					.c("desc").t(JSON.stringify(desc));
					console.log("sending offer");
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
					console.log("this should only be visible for receiver");
					var dataChannel = event.channel;
					dataSenders.getSender(to, true).addDataChannel(dataChannel);
					dataSenders.getSender(to, true).addPeerConnection(dataChannel);

					dataChannel.onerror = function (error) {
						console.log("Data Channel Error:", error);
					};
					dataChannel.onmessage = messageHandlers.mainHandler(to);
					dataChannel.onopen = function () {
						console.log("datachannel opened from receiver");
					};
					dataChannel.onclose = function () {
						console.log("The Data Channel is Closed");
					};
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
							console.log("Sending iceCandidate");
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
				var userid = me.substring(0,me.indexOf("@"));
				var randomId = userid + " - " + Math.random().toString(32).substring(2) + "-" + this.counter++;
				return randomId;
			},
			createAnswerHandler: function (peerConnection, callback) {
				return function(data) {
					console.log("Received answer");
					var desc = JSON.parse(data.getChildrenByTagName("desc")[0].children[0].data);

					var from = data.from;
					peerConnection.setRemoteDescription(
						new RTCSessionDescription(desc), 
						function() {},
						function(err) {
							console.log(err);
						}
					);
					console.log("handled ansswer");
					callback();
				};
			},
			createIceHandler: function (peerConnection) {
				return function (data) {
					if (!peerConnection) {
						console.error("received unwanted iceCandidate");
						return;
					}
					console.log("incoming ice candidate");
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
			console.log(data);
			var from = data.from;
			var desc = JSON.parse(data.getChildrenByTagName("desc")[0].children[0].data);
			var id = data.id;
			if (!id) {
				console.error("no id, something's wrong");
				return;
			}

			var peerConnection = new webkitRTCPeerConnection(config);
			peerConnections.add(peerConnection, from, id);


			var type = data.getChildrenByTagName("x")[0].type;
			if (type === "video") {
				getUserMedia(continueOfferHandling);
			}
			else {
				continueOfferHandling(null);
			}

			function continueOfferHandling(stream) {
				if (stream) peerConnection.addStream(stream);
				peerConnection.setRemoteDescription(new RTCSessionDescription(desc), function() {
				},
				function(err) {
					console.log(err);
				});

				peerConnection.createAnswer(createAnswer(function(desc) {
					peerConnection.setLocalDescription(desc);
					var answer = $msg({to: from, type: "answer", id: id})
					.c("x", {xmlns: constants.xmpp.webrtc}).up()
					.c("desc").t(JSON.stringify(desc));
					console.log("sending answer");
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
			console.log("adding stream");
			console.log(e);

			$rootScope.$apply(function() {
				model.video.remote.src = $sce.trustAsResourceUrl(URL.createObjectURL(e.stream));
			});
		}


		var dataSenders = {
			list: {},
			getSender: function(to, getActualSender, statusCallback) {
				console.log("new sender to: " + to);
				if (!this.list[to]) {
					this.list[to] = this.createSenderObject(to);
				}

				if (getActualSender) {
					return this.list[to];
				}
				else {
					return {
						id: "id",
						send: function(object, type, priority) {
							dataSenders.list[to].sendObject(object, type, statusCallback, priority);
						},
						finished: function() {
							console.log("finished");
							//this.list[to].removeFileId(id);
						}
					};
				}


			},
			createSenderObject: function(to) {
				return {	
					dataChannels: [],
					currentChannel: 0,
					queue: [],
					instanceIds: [],
					sendingData: false,
					listOfPeerConnections: [],
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
						$timeout(function() {
							dataSenders.list[to].readyToCreatePeerConnection = true;
						}, 10000);

						console.log("creating peerconnection");
						var peerConnection = new webkitRTCPeerConnection(config);
						var id = peerConnections.add(peerConnection, to);

						var dataChannel = peerConnection.createDataChannel("channel", {
							ordered: false
						}); 

						dataChannel.onerror = function (error) {
							console.log("Data Channel Error:", error);
						};

						dataChannel.onmessage = messageHandlers.mainHandler(to);

						dataChannel.onopen = function () {
							console.log("datachannel opened from sender");
							dataSenders.list[to].addDataChannel(dataChannel);

						};

						dataChannel.onclose = function () {
							dataSenders.list[to].removeDataChannel(dataChannel);
							console.log("The Data Channel is Closed");
						};

						this.addPeerConnection(peerConnection);

						peerConnection.createOffer(createOffer(function(desc) {
							peerConnection.setLocalDescription(desc);
							console.log(desc);
							var offer = $msg({to: to, type: "offer", id: id})
							.c("x", {xmlns: constants.xmpp.webrtc, type: "data"}).up()
							.c("desc").t(JSON.stringify(desc));
							console.log("sending offer");
							xmpp.send(offer);
						}));


						if (callback) {
							$timeout(callback, 100);
						}
					},
					removeInstanceId: function(instanceId) {
						for (var i in instanceIds) {
							if (this.instanceIds[i] === instanceId) {
								instanceIds.splice(i,1);
								console.log("deleting fileId");
								return;
							}
						}
						console.log("could not find and delete fileId");
					},
					addInstanceId: function(instanceId) {
						this.instanceIds.push(instanceId);
					},
					addDataChannel: function(dataChannel) {
						this.dataChannels.push(dataChannel);
					},
					removeDataChannel: function(dataChannel) {
						console.log("trying to remove dataChannel");
						for (var i in this.dataChannels) {
							if (this.dataChannels[i] === dataChannel) {
								this.dataChannels.splice(i,1);
								console.log("removed dataChannel");
								return;
							}
						}
						console.log("could not find datachannel");

					},
					incrementCurrentChannel: function() {
						if (++this.currentChannel === this.dataChannels.length) {
							this.currentChannel = 0;
						}
					},
					sendOnAvailableChannel: function(object) {
						var counter = 0;
						while (counter++ !== this.dataChannels.length) {
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
						if (priority) {
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
									console.log("No working channels, timing out. number of dataChannels: " + this.dataChannels.length);
									if (this.dataChannels.length < 5) {
										this.newPeerConnection(this.restartDataSender);
									}
									else {
										$timeout(this.restartDataSender, 100);
									}
									
									//$timeout(this.restartDataSender, 100);
									return;
								}
								else {
									this.queue.shift();
								}
							}
							this.sendingData = false;

						}
						else if(!this.listOfPeerConnections.length) {
							console.log("No peerConnections, creating one");
							this.newPeerConnection(this.restartDataSender);
						}
						else {
							console.log("data channel not yet established, waiting");
							$timeout(this.restartDataSender, 1000);
						}
					},
					restartDataSender: function() {
						dataSenders.list[to].sender();
					}
				};

			}
		};

		webrtc.sendObject = function(object, to, type) {
			var sender = dataSenders.getSender(to);
			sender.send(object, type);
		};

		webrtc.getFileSender = function(to, type, statusCallback) {
			console.log("initiating file sender");

			return dataSenders.getSender(to, false, statusCallback);
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
