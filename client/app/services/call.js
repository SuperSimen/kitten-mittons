(function () {

	app.factory('call', function(UWAP, xmpp,  $state, $rootScope, $http, constants, webrtc, fileSender, fileReceiver, $timeout, utility, $sce, callModel) {
		var call = {
			init: function() {
				xmpp.addHandler(xmppHandlers.call, null, "message", "call");
			}
		};


		call.videoCall = function(to) {
			if (callModel.status === "free") {
				callModel.status = "calling";
				callModel.currentId = to;
				callModel.add(to, true, true, true);
				sendCallSignal(to, {type: "offer", audio: true, video: true});
			}
		};

		call.audioCall = function(to) {
			if (callModel.status === "free") {
				callModel.status = "calling";
				callModel.currentId = to;
				callModel.add(to, true, true, false);
				sendCallSignal(to, {type: "offer", audio: true, video: false});
			}
		};

		function sendCallSignal (to, object) {
			xmpp.sendMessage(to, JSON.stringify(object), "call");
		}

		call.cancelCall = function(to) {
			if (callModel.status === "calling" && callModel.currentId === utility.getIdFromJid(to)) {
				callModel.status = "free";
				callModel.currentId = "";
				sendCallSignal(to, {type: "cancel"});

				callModel.remove(utility.getIdFromJid(to));
			}
		};

		call.acceptCall = function(to) {
			callModel.currentId = utility.getIdFromJid(to);
			callModel.status = "accept";
			callModel.getCurrent().hidden = true;
			sendCallSignal(to, {type: "accept"});
		};

		call.denyCall = function(to) {
			callModel.remove(utility.getIdFromJid(to));
			sendCallSignal(to, {type: "deny"});
			callModel.currentId = "";
			callModel.status = "free";
		};

		call.hangup = function() {
			if (callModel.status === "in-call" && callModel.currentId) {
				sendCallSignal(callModel.currentId, {type: "hangup"});
				model.chat.get(callModel.currentId).addSystemMessage("Call ended");
				webrtc.hangup();
			}
		};

		call.toggleVideo = function() {
			var video = !callModel.video.local.videoEnabled;
			callModel.video.local.videoEnabled = video;
			webrtc.enableVideo(video);
		};

		call.toggleAudio = function() {
			var audio = !callModel.video.local.audioEnabled;
			callModel.video.local.audioEnabled = audio;
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
						if (callModel.status === "free") {
							$rootScope.$apply(function() {
								model.chat.get(from).ping();
								callModel.add(from, false, callMessage.audio, callMessage.video);
							});
						}
						else {
							sendCallSignal(data.from, {type: "deny"});
						}
					}
					else if (type === "accept" && 
						callModel.status === "calling" &&
						callModel.currentId === from) {

						$rootScope.$apply(function() {
							callModel.getCurrent().hidden = true;
						});

						webrtc.call(data.from);
					}
					else if (type === "deny" && 
						callModel.status === "calling" &&
						callModel.currentId === from) {

						$rootScope.$apply(function() {
							model.chat.get(from).addSystemMessage("Call denied");
							callModel.deleteCurrent();
						});

						callModel.status = "free";
					}
					else if (type === "cancel" && callModel.status === "free") {
						$rootScope.$apply(function() {
							callModel.remove(from);
							model.chat.get(from).addSystemMessage("Call canceled");
						});
					}
					else if (type === "hangup" && callModel.status === "in-call") {
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

	app.factory('callModel', function() {
		callModel = {
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

		callModel.video = {
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

		return callModel;
	});

})();
