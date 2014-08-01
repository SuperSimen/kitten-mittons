(function () {

	app.factory('webrtc', function(constants,  $rootScope, $sce, xmpp, $timeout, utility, peerConnections, dataSender, callModel) {
		var webrtc = {
			init: function() {
				xmpp.addHandler(handleOffer, constants.xmpp.webrtc, "message", "offer");
				xmpp.addHandler(handleWebrtc, constants.xmpp.webrtc, "message");
			}
		};

		function handleWebrtc(data) {
		}
			
		function getUserMedia(callback) {
			if (callModel.video.local.stream) {
				console.log("already has stream");
				callback(callModel.video.local.stream);
				return;
			}

			try {
				var currentCall = callModel.getCurrent();
				navigator.webkitGetUserMedia({
					video: currentCall.video,
					audio: currentCall.audio
				},
				function(stream) {
					callModel.video.local.src = $sce.trustAsResourceUrl(URL.createObjectURL(stream));
					callModel.video.local.stream = stream;
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
			if (!callModel.video.active) {
				callModel.video.remote.userId = utility.getIdFromJid(to);
				videoCall(to);
			}
			else {
				console.log("call already active");
			}
		};

		function reset() {
			if (callModel.video.active) {
				video.close();
			}
			callModel.video.remote.src = "";
			callModel.video.remote.userId = "";
			callModel.video.active = false;
			if (callModel.video.local.stream) {
				callModel.video.local.stream.stop();
				callModel.video.local.stream = null;
			}
			callModel.status = "free";
			callModel.deleteCurrent();
		}

		webrtc.hangup = function() { 
			reset();
		};

		webrtc.toggleVideo = function(enable) {
			video.enableVideo(!webrtc.isVideoEnabled());

		};
		webrtc.toggleAudio = function(enable) {
			video.enableAudio(!webrtc.isAudioEnabled());
		};

		webrtc.isAudioEnabled = function() {
			if (video.stream) {
				return video.stream.getAudioTracks()[0].enabled;
			}
			return true;
		};

		webrtc.isVideoEnabled = function() {
			if (video.stream) {
				return video.stream.getVideoTracks()[0].enabled;
			}
			return true;
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
			if (type === "video" && callModel.currentId !== utility.getIdFromJid(data.from) && callModel.status === "accept") {
				console.log(data.from);
				return console.log("already video call");
			}

			var peerConnection = new peerConnections.create();
			peerConnections.add(peerConnection, from, id, dataSender.onDataChannel(from));

			if (type === "video") {
				callModel.video.active = true;

				getUserMedia(continueOfferHandling);
				callModel.video.remote.userId = utility.getIdFromJid(from);
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
