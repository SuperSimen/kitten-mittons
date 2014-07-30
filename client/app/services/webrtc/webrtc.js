(function () {

	app.factory('webrtc', function(constants, model, $rootScope, $sce, xmpp, $timeout, utility, peerConnections, dataSender, call) {
		var webrtc = {
			init: function() {
				xmpp.addHandler(handleOffer, constants.xmpp.webrtc, "message", "offer");
				xmpp.addHandler(handleWebrtc, constants.xmpp.webrtc, "message");
			}
		};

		function handleWebrtc(data) {
		}
			
		function getUserMedia(callback) {
			if (call.model.video.local.stream) {
				console.log("already has stream");
				callback(call.model.video.local.stream);
				return;
			}

			try {
				var currentCall = call.model.getCurrent();
				navigator.webkitGetUserMedia({
					video: currentCall.video,
					audio: currentCall.audio
				},
				function(stream) {
					call.model.video.local.src = $sce.trustAsResourceUrl(URL.createObjectURL(stream));
					call.model.video.local.stream = stream;
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
			if (!call.model.video.active) {
				call.model.video.remote.userId = utility.getIdFromJid(to);
				videoCall(to);
			}
			else {
				console.log("call already active");
			}
		};

		function reset() {
			if (call.model.video.active) {
				video.close();
			}
			call.model.video.remote.src = "";
			call.model.video.remote.userId = "";
			call.model.video.active = false;
			if (call.model.video.local.stream) {
				call.model.video.local.stream.stop();
				call.model.video.local.stream = null;
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
				call.model.video.active = true;

				getUserMedia(continueOfferHandling);
				call.model.video.remote.userId = utility.getIdFromJid(from);
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
