(function () {

	app.factory('webrtc', function(constants, model, $rootScope, $sce, xmpp, $timeout) {
		var webrtc = {};
		var config = {
			iceServers: constants.iceServers
		};

		var options = {
			videoFromCaller: true,
			audioFromCaller: false,
			videoFromAnswerer: true,
			audioFromAnswerer: false
		};

		webrtc.init = function() {
			xmpp.addHandler(handleOffer, constants.xmpp.webrtc, "message", "offer");
			xmpp.addHandler(handleWebrtc, constants.xmpp.webrtc, "message");
		};

		function handleWebrtc(stanza) {
			return true;
		}

			
		var localStream;	
		function getUserMedia(callback, includeAudio, includeVideo) {
			if (localStream) {
				return localStream;
			}

			navigator.webkitGetUserMedia(
				{audio: includeAudio, video: includeVideo},
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

			if (!(options.videoFromCaller || options.audioFromCaller)) {
				continueCall(to)(null);
			}
			else {
				getUserMedia(continueCall(to), options.audioFromCaller, options.videoFromCaller);
			}

			function continueCall (to) {
				return function(stream) {
					var peerConnection = new webkitRTCPeerConnection(config);
					peerConnection.createDataChannel("klj", {});
					var id = peerConnections.add(peerConnection, to);

					if (stream) peerConnection.addStream(stream);
					peerConnection.createOffer(createOffer(function(desc) {
						peerConnection.setLocalDescription(desc);
						console.log(desc);
						var offer = $msg({to: to, type: "offer", id: id})
						.c("x", {xmlns: constants.xmpp.webrtc, type: "video"}).up()
						.c("desc").t(JSON.stringify(desc));
						console.log("sending offer");
						xmpp.send(offer);
					}));
				};
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
					dataSenders.getSender(to).addDataChannel(dataChannel);

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
				if (!(options.audioFromAnswerer || options.videoFromAnswerer)) {
					continueOfferHandling(null);
				}
				else {
					getUserMedia(continueOfferHandling, options.audioFromAnswerer, options.videoFromAnswerer);
				}
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
				model.video.remote = $sce.trustAsResourceUrl(URL.createObjectURL(e.stream));
			});
		}


		var dataSenders = {
			list: {},
			getSender: function(to, id) {
				console.log("new sender to: " + to);
				if (!this.list[to]) {
					this.list[to] = this.createSenderObject(to);
				}
				if (id) {
					if (this.list[to].ids[id]) {
						console.error("id not unique");
						return;
					}

					this.list[to].ids[id] = true;
				}

				return this.list[to];
			},
			finishedSending: function(to, id) {
				console.log("this is not good.");
				if (this.list[to] && this.list[to].ids[id]) {
					delete this.list[to].ids[id];
					console.log("deleting sender id");
					if (Object.keys(this.list[to].ids).length === 0) {
						console.log("deleting sender");
						delete this.list[to];
					}

				}
				else {
					console.error("cannot remove id");
				}
			},
			createSenderObject: function(to) {
				return {	
					list: [],
					currentChannel: 0,
					queue: [],
					ids: {},
					sendingData: false,
					addDataChannel: function(dataChannel) {
						var object = {
							channel: dataChannel,
							timeout: false
						};
						this.list.push(object);
						console.log("Number of data channels: " + this.list.length);
					},
					incrementCurrentChannel: function() {
						if (++this.currentChannel === this.list.length) {
							this.currentChannel = 0;
						}
					},
					sendOnAvailableChannel: function(object) {
						var counter = 0;
						while (counter++ !== this.list.length) {
							try {
								this.list[this.currentChannel].channel.send(object);
								return true;
							}
							catch (err) {
							}
							this.incrementCurrentChannel();
						}
						function resetTimeout(channelId) {
							return function() {
								dataSender.list[channelId].timeout = false;
							};
						}
						return false;
					},
					sendObject: function(object, type) {
						var msg = {
							data: object,
							type: type
						};
						this.addToQueue(JSON.stringify(msg));
					},
					addToQueue: function(data) {
						this.queue.push(data);
						if (!this.sendingData) {
							this.sendingData = true;
							this.restartDataSender();
						}
					},
					sender: function() {
						if (this.list.length) {
							while(this.queue.length) {
								var success = this.sendOnAvailableChannel(this.queue[0]);
								if (!success) {
									console.log("No working channels, timing out");
									$timeout(this.restartDataSender, 1000);
									return;
								}
								else {
									this.queue.shift();
								}
							}
							this.sendingData = false;

						}
						else {
							console.log("no channels");
							console.log(dataSenders);
						}
					},
					restartDataSender: function() {
						console.log(this.queue);
						console.log(this.queue.length);
						dataSenders.list[to].sender();
					}
				};

			}
		};

		webrtc.sendObject = function(object, to, type) {
			var sender = dataSenders.getSender(to);
			sender.sendObject(object, type);
		};

		webrtc.getSender = function(to, type, callback) {
			console.log("initiating file sender");

			var dataId = Math.random().toString(32).substring(2);
			var sender = dataSenders.getSender(to, dataId);
			console.log("this is this");
			console.log(this);

			var peerConnection = new webkitRTCPeerConnection(config);
			var id = peerConnections.add(peerConnection, to);

			var dataChannel = peerConnection.createDataChannel("channel1", {
				ordered: false
			}); 

			dataChannel.onerror = function (error) {
				console.log("Data Channel Error:", error);
			};

			dataChannel.onmessage = messageHandlers.mainHandler(to);

			dataChannel.onopen = function () {
				console.log("datachannel opened from sender");
				callback({
					send: function(object) {
						sender.sendObject(object, type);
					},
					close: function() {
						//dataSenders.finishedSending(to, dataId);
						//peerConnection.close();
					}
				});
			};
			dataChannel.onclose = function () {
				console.log("The Data Channel is Closed");
			};

			sender.addDataChannel(dataChannel);
			peerConnection.createOffer(createOffer(function(desc) {
				peerConnection.setLocalDescription(desc);
				console.log(desc);
				var offer = $msg({to: to, type: "offer", id: id})
				.c("x", {xmlns: constants.xmpp.webrtc, type: "data"}).up()
				.c("desc").t(JSON.stringify(desc));
				console.log("sending offer");
				xmpp.send(offer);
			}));

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
