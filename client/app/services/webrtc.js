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
			model.video.remote.userId = to.substring(0, to.indexOf("@"));
			videoCall(to);
		};

		function videoCall (to) {
			getUserMedia(continueCall);

			function continueCall (stream) {
				var peerConnection = new webkitRTCPeerConnection(config);
				if (stream) peerConnection.addStream(stream);

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
				model.video.remote.userId = from.substring(0, from.indexOf("@"));
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
			counter: 0,
			getSender: function(to, getActualSender, type, statusCallback) {
				if (!this.list[to]) {
					this.list[to] = this.createSenderObject(to);
				}

				if (getActualSender) {
					return this.list[to];
				}
				else {
					var id = Math.random().toString(32).substring(2) + this.counter++;
					this.list[to].addInstanceId(id);
					return {
						send: function(object, priority) {
							dataSenders.list[to].sendObject(object, type, statusCallback, priority);
						},
						finished: function() {
							console.log("finished");
							dataSenders.list[to].removeInstanceId(id);
							if (dataSenders.list[to].instanceIds.length === 0) {
								console.log("here");
								dataSenders.list[to].clean(function() {
								console.log("here inside");
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
						this.timeoutPromise = $timeout(function() {
							if (dataSenders.list[to]) {
								dataSenders.list[to].readyToCreatePeerConnection = true;
							}
						}, 10000);

						console.log("creating peerconnection");
						var peerConnection = new webkitRTCPeerConnection(config);
						var id = peerConnections.add(peerConnection, to);

						var dataChannel = peerConnection.createDataChannel("channel", {
							ordered: false
						}); 


						this.addPeerConnection(peerConnection);
						this.addDataChannel(dataChannel);

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
					clean: function(callback) {
						console.log("CLEANING!!!!!!!!!!");

						while (this.listOfPeerConnections.length) {
							this.listOfPeerConnections[0].close();
							this.listOfPeerConnections.shift();
						}

						this.currentChannel = 0;

						if (callback) callback();
					},
					removeInstanceId: function(instanceId) {
						for (var i in this.instanceIds) {
							if (this.instanceIds[i] === instanceId) {
								this.instanceIds.splice(i,1);
								console.log("deleting instanceId");
								return;
							}
						}
						console.log("could not find and delete fileId");
					},
					addInstanceId: function(instanceId) {
						this.instanceIds.push(instanceId);
					},
					addDataChannel: function(dataChannel) {

						dataChannel.onerror = function (error) {
							console.log("Data Channel Error:", error);
						};
						dataChannel.onmessage = messageHandlers.mainHandler(to);
						dataChannel.onopen = function () {
							dataSenders.list[to].dataChannels.push(dataChannel);
							console.log("adding datachannel, number of datachannels: " + dataSenders.list[to].dataChannels.length);
							console.log("to: " + to);
						};
						dataChannel.onclose = function () {
							if (dataSenders.list[to]) {
								dataSenders.list[to].removeDataChannel(dataChannel);
							}
							console.log("The Data Channel is Closed");
						};

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
							console.log("adding message to the front of the queue");
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
									console.log("No working channels, timing out. number of dataChannels: " + this.dataChannels.length + " number of peerConnections: " + this.listOfPeerConnections.length);
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

		webrtc.getFileSender = function(to, type, statusCallback) {
			console.log("initiating file sender");

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
