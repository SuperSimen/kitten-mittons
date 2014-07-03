(function () {

	app.factory('webrtc', function(constants, model, $rootScope, $sce, xmpp, $timeout) {
		var webrtc = {};
		var config = {
			iceServers: constants.iceServers
		};

		var options = {
			videoFromCaller: false,
			audioFromCaller: false,
			videoFromAnswerer: false,
			audioFromAnswerer: false
		};


		var peerConnection;
		webrtc.init = function() {
			xmpp.addHandler(handleOffer, xmpp.api.webrtc, "message", "offer");
			xmpp.addHandler(handleAnswer, xmpp.api.webrtc, "message", "answer");
			xmpp.addHandler(handleIceCandidate, xmpp.api.webrtc, "message", "iceCandidate");
			xmpp.addHandler(handleWebrtc, xmpp.api.webrtc, "message");
		};

		function handleWebrtc(stanza) {
			return true;
		}

		function getUserMedia(callback, includeAudio, includeVideo) {
			navigator.webkitGetUserMedia(
				{audio: includeAudio, video: includeVideo},
				function(stream) {
					callback(stream);
				}, function() {
					console.log(arguments);
				}
			);
		}

		var localStream;	
		webrtc.call = function (to) {
			if (!(options.videoFromCaller || options.audioFromCaller)) {
				continueCall(to)(null);
			}
			else if (!localStream) {
				getUserMedia(continueCall(to), options.audioFromCaller, options.videoFromCaller);
			}
			else {
				continueCall(to)(localStream);
			}
		};

		function continueCall (to) {
			return function(stream) {
				peerConnection = peerConnections.add(new webkitRTCPeerConnection(config), to);
				setConnectionEvents(peerConnection, to);

				dataSender.addDataChannel(peerConnection.createDataChannel("channel1", {
					ordered: false
				})); 

				if (stream) peerConnection.addStream(stream);
				peerConnection.createOffer(createOffer(function(desc) {
					peerConnection.setLocalDescription(desc);
					console.log(desc);
					var offer = $msg({to: to, type: "offer"})
					.c("x", {xmlns: xmpp.api.webrtc}).up()
					.c("desc").t(JSON.stringify(desc));
					console.log("sending offer");
					xmpp.send(offer);
				}));
			};
		}


		function setConnectionEvents(peerConnection, to) {
			peerConnection.onaddstream = onAddStream;
			peerConnection.ondatachannel = onDataChannel;
			iceCandidates.to = to;
			peerConnection.onicecandidate = function(event) {
				if (event.candidate) {
					iceCandidates.addIceCandidate(event.candidate);
				}
			};
		}

		var iceCandidates = {
			list: [],
			readyToSend: false,
			to: "",
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
				if (!this.to) {
					console.err("SENDING TO WHOM=!? WHAT??!!");
					return;
				}
				for (var i in this.list) {
					var iceCandidate = $msg({to: this.to, type: "iceCandidate"})
					.c("x", {xmlns: xmpp.api.webrtc}).up()
					.c("desc").t(JSON.stringify(this.list[i]));
					console.log("Sending iceCandidate");
					xmpp.send(iceCandidate);
				}
				this.list.length = 0;
			}
		};


		function handleOffer (stanza) {
			console.log("Received offer");
			var from = stanza.getAttribute("from");
			var desc = JSON.parse(stanza.getElementsByTagName("desc")[0].innerHTML);
			peerConnection = peerConnections.add(new webkitRTCPeerConnection(config));
			setConnectionEvents(peerConnection, from);

			if (!(options.audioFromAnswerer || options.videoFromAnswerer)) {
				continueOfferHandling(from, desc)(null);
			}
			else {
				getUserMedia(continueOfferHandling(from, desc), options.audioFromAnswerer, options.videoFromAnswerer);
			}

			return true;
		}

		function continueOfferHandling(from, desc) {
			return function(stream) {
				if (stream) peerConnection.addStream(stream);
				peerConnection.setRemoteDescription(new RTCSessionDescription(desc), function() {
				},
				function(err) {
					console.log(err);
				});
				peerConnection.createAnswer(createAnswer(function(desc) {
					peerConnection.setLocalDescription(desc);
					var answer = $msg({to: from, type: "answer"})
					.c("x", {xmlns: xmpp.api.webrtc}).up()
					.c("desc").t(JSON.stringify(desc));
					console.log("sending answer");
					xmpp.send(answer);
				}, function() {console.error(arguments);}));
				iceCandidates.setReadyToSend(true);
			};

		}

		function handleAnswer (stanza) {
			console.log("Received answer");
			var tempDesc = JSON.parse(stanza.getElementsByTagName("desc")[0].innerHTML);
			var from = stanza.getAttribute("from");
			peerConnection.setRemoteDescription(
				new RTCSessionDescription(tempDesc), 
				function() {},
				function(err) {
					console.log(err);
				}
			);
			iceCandidates.setReadyToSend(true);
			return true;
		}

		function handleIceCandidate (stanza, count) {
			if (!peerConnection) {
				console.error("received unwanted iceCandidate");
				return true;
			}
			console.log("incoming ice candidate");
			var candidate = stanza.getElementsByTagName("desc")[0].innerHTML;
			var ice = new RTCIceCandidate(JSON.parse(candidate));
			peerConnection.addIceCandidate(ice, function() {
			},
			function(err) {
				console.log(err);
			});

			return true;
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
				model.webrtc.video = $sce.trustAsResourceUrl(URL.createObjectURL(e.stream));
			});
		}

		function onDataChannel (event) {
			console.log("adding datachannel");
			dataSender.addDataChannel(event.channel);
		}

		var peerConnections = {
			list: [],
			add: function(peerConnection) {
				this.list.push(peerConnection);
				return peerConnection;
			},

		};

		var dataSender = {
			list: [],
			currentChannel: 0,
			queue: [],
			sendingData: false,
			queueMaxLength: 0,
			addDataChannel: function(dataChannel) {
				this.setChannelEvents(dataChannel);
				var object = {
					channel: dataChannel,
					timeout: false
				};
				this.list.push(object);
				console.log("Number of data channels: " + this.list.length);
			},
			setChannelEvents: function(dataChannel) {
				dataChannel.onerror = function (error) {
					console.log("Data Channel Error:", error);
				};

				dataChannel.onmessage = messageHandlers.mainHandler;

				dataChannel.onopen = function () {
					console.log("datachannel opened");
				};
				dataChannel.onclose = function () {
					console.log("The Data Channel is Closed");
				};
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
				object.queueMaxLength = this.queueMaxLength;
				var msg = {
					data: object,
					type: type
				};
				this.addToQueue(JSON.stringify(msg));
			},
			addToQueue: function(data) {
				this.queue.push(data);
				if (this.queue.length > this.queueMaxLength) {
					this.queueMaxLength = this.queue.length;
				}
				if (!this.sendingData) {
					this.sendingData = true;
					this.restartDataSender();
				}
			},
			sender: function() {
				while(this.queue.length) {
					var success = this.sendOnAvailableChannel(this.queue[0]);
					if (!success) {
						console.log("No working channels, timing out");
						$timeout(this.restartDataSender, 100);
						return;
					}
					else {
						this.queue.shift();
					}
				}
				this.sendingData = false;
			},
			restartDataSender: function() {
				dataSender.sender();
			}
		};

		webrtc.sendObject = function(object, type) {
			if (!dataSender.list.length) {
				console.log("no available channels");
				return;
			}
			dataSender.sendObject(object, type);
		};

		var messageHandlers = {
			list: {},
			cleanHandler: function(event) {
				messageHandlers.list.file(event.data);
			},
			mainHandler: function(event) {
				var message = JSON.parse(event.data);
				var data = message.data;

				if (message.type && messageHandlers.list[message.type]) {
					messageHandlers.list[message.type](data);
					return;
				}
				else {
					console.log("hot message");
					console.log(event.data);
				}
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
