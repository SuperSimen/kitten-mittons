(function () {

	app.factory('call', function(UWAP, xmpp, model, $state, $rootScope, $http, constants, webrtc, fileSender, fileReceiver, $timeout, utility, $sce) {
		var call = {
			init: function() {
				xmpp.addHandler(xmppHandlers.call, null, "message", "call");
			}
		};

		call.videoCall = function(to) {
			if (model.call.status === "free") {
				model.call.status = "calling";
				model.call.currentId = to;
				model.call.add(to, true, true, true);
				sendCallSignal(to, {type: "offer", audio: true, video: true});
			}
		};

		call.audioCall = function(to) {
			if (model.call.status === "free") {
				model.call.status = "calling";
				model.call.currentId = to;
				model.call.add(to, true, true, false);
				sendCallSignal(to, {type: "offer", audio: true, video: false});
			}
		};

		function sendCallSignal (to, object) {
			xmpp.sendMessage(to, JSON.stringify(object), "call");
		}

		call.cancelCall = function(to) {
			if (model.call.status === "calling" && model.call.currentId === utility.getIdFromJid(to)) {
				model.call.status = "free";
				model.call.currentId = "";
				sendCallSignal(to, {type: "cancel"});

				model.call.remove(utility.getIdFromJid(to));
			}
		};

		call.acceptCall = function(to) {
			model.call.currentId = utility.getIdFromJid(to);
			model.call.status = "accept";
			model.call.getCurrent().hidden = true;
			sendCallSignal(to, {type: "accept"});
		};

		call.denyCall = function(to) {
			model.call.remove(utility.getIdFromJid(to));
			sendCallSignal(to, {type: "deny"});
			model.call.currentId = "";
			model.call.status = "free";
		};

		call.hangup = function() {
			if (model.call.status === "in-call" && model.call.currentId) {
				sendCallSignal(model.call.currentId, {type: "hangup"});
				model.chat.get(model.call.currentId).addSystemMessage("Call ended");
				webrtc.hangup();
			}
		};

		call.toggleVideo = function() {
			var video = !model.video.local.videoEnabled;
			model.video.local.videoEnabled = video;
			webrtc.enableVideo(video);
		};

		call.toggleAudio = function() {
			var audio = !model.video.local.audioEnabled;
			model.video.local.audioEnabled = audio;
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
						if (model.call.status === "free") {
							$rootScope.$apply(function() {
								model.chat.get(from).ping();
								model.call.add(from, false, callMessage.audio, callMessage.video);
							});
						}
						else {
							sendCallSignal(data.from, {type: "deny"});
						}
					}
					else if (type === "accept" && 
						model.call.status === "calling" &&
						model.call.currentId === from) {

						$rootScope.$apply(function() {
							model.call.getCurrent().hidden = true;
						});

						webrtc.call(data.from);
					}
					else if (type === "deny" && 
						model.call.status === "calling" &&
						model.call.currentId === from) {

						$rootScope.$apply(function() {
							model.chat.get(from).addSystemMessage("Call denied");
							model.call.deleteCurrent();
						});

						model.call.status = "free";
					}
					else if (type === "cancel" && model.call.status === "free") {
						$rootScope.$apply(function() {
							model.call.remove(from);
							model.chat.get(from).addSystemMessage("Call canceled");
						});
					}
					else if (type === "hangup" && model.call.status === "in-call") {
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
