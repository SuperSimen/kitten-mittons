(function () {

	app.factory('call', function(UWAP, xmpp,  $state, $rootScope, $http, constants, webrtc, fileSender, fileReceiver, $timeout, utility, $sce) {
		var call = {
			init: function() {
				xmpp.addHandler(xmppHandlers.call, null, "message", "call");
			}
		};
		call.model = {
			list: {},
			status: "free",
			currentId: "",
			getCurrent: function() {
				return this.list[this.currentId];
			},
			add: function(id, calling, audio, video) {
				if (this.list[id]) {
					console.log("already call with id");
					return;
				}
				this.list[id] = {
					id: id,
					video: video,
					audio: audio,
					hidden: false,
					calling: calling
				};
			},
			deleteCurrent: function() {
				if (this.list[this.currentId]) {
					delete this.list[this.currentId];
					this.currentId = "";
				}
			},
			remove: function(id) {
				if (this.list[id]) {
					delete this.list[id];
				}
			}

		};


		call.model.video = {
			active: null,
			busy: null,
			local: {
				videoEnabled: true,
				audioEnabled: true,
				src: ""
			},
			remote: {
				src: "",
				userId: ""
			}
		};

		call.videoCall = function(to) {
			if (call.model.status === "free") {
				call.model.status = "calling";
				call.model.currentId = to;
				call.model.add(to, true, true, true);
				sendCallSignal(to, {type: "offer", audio: true, video: true});
			}
		};

		call.audioCall = function(to) {
			if (call.model.status === "free") {
				call.model.status = "calling";
				call.model.currentId = to;
				call.model.add(to, true, true, false);
				sendCallSignal(to, {type: "offer", audio: true, video: false});
			}
		};

		function sendCallSignal (to, object) {
			xmpp.sendMessage(to, JSON.stringify(object), "call");
		}

		call.cancelCall = function(to) {
			if (call.model.status === "calling" && call.model.currentId === utility.getIdFromJid(to)) {
				call.model.status = "free";
				call.model.currentId = "";
				sendCallSignal(to, {type: "cancel"});

				call.model.remove(utility.getIdFromJid(to));
			}
		};

		call.acceptCall = function(to) {
			call.model.currentId = utility.getIdFromJid(to);
			call.model.status = "accept";
			call.model.getCurrent().hidden = true;
			sendCallSignal(to, {type: "accept"});
		};

		call.denyCall = function(to) {
			call.model.remove(utility.getIdFromJid(to));
			sendCallSignal(to, {type: "deny"});
			call.model.currentId = "";
			call.model.status = "free";
		};

		call.hangup = function() {
			if (call.model.status === "in-call" && call.model.currentId) {
				sendCallSignal(call.model.currentId, {type: "hangup"});
				model.chat.get(call.model.currentId).addSystemMessage("Call ended");
				webrtc.hangup();
			}
		};

		call.toggleVideo = function() {
			var video = !call.model.video.local.videoEnabled;
			call.model.video.local.videoEnabled = video;
			webrtc.enableVideo(video);
		};

		call.toggleAudio = function() {
			var audio = !call.model.video.local.audioEnabled;
			call.model.video.local.audioEnabled = audio;
			webrtc.enableAudio(audio);
		};

		var xmppHandlers = {
			call: function(data) {
				var body = data.getChildrenByTagName("body");
				if (body) {
					var callMessage = JSON.parse(body[0].children[0].data);
					var type = callMessage.type;
					console.log(type);
					var from = utility.getIdFromJid(data.from);
					if (type === "offer") {
						if (call.model.status === "free") {
							$rootScope.$apply(function() {
								model.chat.get(from).ping();
								call.model.add(from, false, callMessage.audio, callMessage.video);
							});
						}
						else {
							sendCallSignal(data.from, {type: "deny"});
						}
					}
					else if (type === "accept" && 
						call.model.status === "calling" &&
						call.model.currentId === from) {

						$rootScope.$apply(function() {
							call.model.getCurrent().hidden = true;
						});

						webrtc.call(data.from);
					}
					else if (type === "deny" && 
						call.model.status === "calling" &&
						call.model.currentId === from) {

						$rootScope.$apply(function() {
							model.chat.get(from).addSystemMessage("Call denied");
							call.model.deleteCurrent();
						});

						call.model.status = "free";
					}
					else if (type === "cancel" && call.model.status === "free") {
						$rootScope.$apply(function() {
							call.model.remove(from);
							model.chat.get(from).addSystemMessage("Call canceled");
						});
					}
					else if (type === "hangup" && call.model.status === "in-call") {
						$rootScope.$apply(function() {
							webrtc.hangup();
							model.chat.get(from).addSystemMessage("Call ended");
						});
					}
					else {
						console.error("received unwanted call signaling " + body);
					}


				} 
			},
		};
		return call;
	});

})();
