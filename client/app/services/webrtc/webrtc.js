(function () {

	app.factory('webrtc', function(constants,  $rootScope, $sce, xmpp, $timeout, utility, peerConnections, dataSender, call, callVideo) {
		var webrtc = {
			init: function() {
				xmpp.addHandler(handleOffer, constants.xmpp.webrtc, "message", "offer");
				xmpp.addHandler(handleWebrtc, constants.xmpp.webrtc, "message");
			}
		};

		function handleWebrtc(data) {
		}
			
		function getUserMedia(callback) {
			if (callVideo.local.stream) {
				console.log("already has stream");
				callback(callVideo.local.stream);
				return;
			}

			try {
				var currentCall = call.model.getCurrent();
				navigator.webkitGetUserMedia({
					video: currentCall.video,
					audio: currentCall.audio
				},
				function(stream) {
					callVideo.local.src = $sce.trustAsResourceUrl(URL.createObjectURL(stream));
					callVideo.local.stream = stream;
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
			if (!callVideo.active) {
				callVideo.remote.userId = utility.getIdFromJid(to);
				videoCall(to);
			}
			else {
				console.log("call already active");
			}
		};

		function reset() {
			if (callVideo.active) {
				video.close();
			}
			callVideo.remote.src = "";
			callVideo.remote.userId = "";
			callVideo.active = false;
			if (callVideo.local.stream) {
				callVideo.local.stream.stop();
				callVideo.local.stream = null;
			}
			call.model.status = "free";
			call.model.deleteCurrent();
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
				var peerConnection = peerConnections.create();
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

		function handleOffer (data) {
			var from = data.from;
			var desc = JSON.parse(data.getChildrenByTagName("desc")[0].children[0].data);
			var id = data.id;
			if (!id) {
				console.error("no id, something's wrong");
				return;
			}

			var type = data.getChildrenByTagName("x")[0].type;
			if (type === "video" && call.model.currentId !== utility.getIdFromJid(data.from) && call.model.status === "accept") {
				console.log(data.from);
				return console.log("already video call");
			}

			var peerConnection = new peerConnections.create();
			peerConnections.add(peerConnection, from, id, dataSender.onDataChannel(from));

			if (type === "video") {
				callVideo.active = true;

				getUserMedia(continueOfferHandling);
				callVideo.remote.userId = utility.getIdFromJid(from);
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

		return webrtc;

	});
})();
