(function () {

	app.factory('webrtc', function(constants, model, $rootScope, $sce, xmpp, $timeout, utility) {
		var webrtc = {
			init: function() {
				xmpp.addHandler(handleOffer, constants.xmpp.webrtc, "message", "offer");
				xmpp.addHandler(handleWebrtc, constants.xmpp.webrtc, "message");
			}
		};

		var config = {
			iceServers: constants.iceServers
		};

		function handleWebrtc(stanza) {
			return true;
		}
			
		function getUserMedia(callback) {
			if (model.video.local.stream) {
				console.log("already has stream");
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
			getUserMedia(continueCall);

			function continueCall (stream) {
				var peerConnection = new webkitRTCPeerConnection(config);
				globalStream = stream;
				peerConnection.addStream(stream);
				video.setPeerConnection(peerConnection);

				var id = peerConnections.add(peerConnection, to);

				peerConnection.createOffer(createDesc(function(desc) {
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

		webrtc.addPeerConnection = function(peerConnection) {
			peerConnections.add(peerConnection);
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
					globalStream = stream;
					peerConnection.addStream(stream);
					video.setPeerConnection(peerConnection);
				}

				peerConnection.setRemoteDescription(new RTCSessionDescription(desc), function() {},
				function(err) {
					console.log(err);
				});

				peerConnection.createAnswer(createDesc(function(desc) {
					peerConnection.setLocalDescription(desc);
					var answer = $msg({to: from, type: "answer", id: id})
					.c("x", {xmlns: constants.xmpp.webrtc}).up()
					.c("desc").t(JSON.stringify(desc));
					xmpp.send(answer);
				}, function() {console.error(arguments);}));

				peerConnections.getIceCandidates(id).setReadyToSend(true);
			}
		}

		function createDesc(callback){
			return function(desc) {
				callback(desc);
			};
		}

		function onAddStream (e){
			$rootScope.$apply(function() {
				model.video.active = true;
				model.call.status = "in-call";
				model.video.remote.src = $sce.trustAsResourceUrl(URL.createObjectURL(e.stream));
				model.video.remote.stream = e.stream;
			});
		}

		return webrtc;

	});
})();
