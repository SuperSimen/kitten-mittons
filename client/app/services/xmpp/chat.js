(function () {

	app.factory('chat', function(UWAP, xmpp, model, $state, $rootScope, $http, constants, webrtc, fileSender, fileReceiver, $timeout, utility, $sce) {

		var chat = {
			init: function () {
				xmpp.addHandler(xmppHandlers.mucMessage, null, "message", "groupchat" );
				xmpp.addHandler(xmppHandlers.message, null, "message", "chat");
				xmpp.addHandler(xmppHandlers.roomInvite, null, "message", "roomInvite");
				xmpp.addHandler(xmppHandlers.fileInvite, null, "message", "fileInvite");
				xmpp.addHandler(xmppHandlers.systemNotification, null, "message", "systemNotification");
			}
		};

		chat.sendMessage = function(to, message) {
			var jid = utility.getJidFromId(to);
			var messageObject = model.chat.get(to).addMessage(model.user.info.xmpp.jid, message, true);

			xmpp.sendMessage(jid, message, "chat", function() {
				$rootScope.$apply(function() {
					messageObject.arrived = true;
				});
			});
		};

		chat.sendGroupMessage = function(to, message) {
			xmpp.sendGroupMessage(to, message);
		};

		chat.createRoom = function() {
			var id = model.chat.createRoom();
			xmpp.joinRoom(utility.getRoomIdFromJid(id));
		};

		chat.closeChat = function(id) {
			console.log("closing chat");
			if (model.chat.get(id).isRoom) {
				console.log("is room");
				if(model.chat.get(id).conferenceOpen) {
					// Close meetme conference
					model.conference.closeActive();
				}
				xmpp.leaveRoom(id);
			}
			model.chat.close(id);
		};


		var xmppHandlers = {
			
			systemNotification: function(data) {
				var body = data.getChildrenByTagName("body");
				if (body) {
					var req = JSON.parse(body[0].children[0].data);
					$rootScope.$apply(function() {
						model.chat.get(req.chatId).addSystemMessage(req.message);
					});
				} 
			},
			
			roomInvite: function(data) {
				var body = data.getChildrenByTagName("body");
				if (body) {
					var roomId = body[0].children[0].data;
					$rootScope.$apply(function() {
						model.chat.createRoom(roomId);
					});
					xmpp.joinRoom(utility.getRoomIdFromJid(roomId));
				} 
			},
			message: function(data) {
				var message = data.getChildrenByTagName("body")[0].children[0].data;
				var id = utility.getIdFromJid(data.from);

				$rootScope.$apply(function() {
					model.chat.get(id).addMessage(id, message);
				});
			},
			mucMessage: function(data) {
				var body = data.getChildrenByTagName("body")[0];
				if (body) {
					var message = body.children[0].data;
					var id = utility.getIdFromJid(data.from);
					var from = utility.getNicknameFromRoomJid(data.from);

					$rootScope.$apply(function() {
						model.chat.get(id).addMessage(from, message);
					});
				}
			},
		};

		chat.sendRoomInvite = function(friend, roomId) {
			xmpp.sendMessage(friend.id, roomId, "roomInvite");
		};

		chat.sendSystemNotification = function(to_id, group_id, message) {
			var data = {
				chatId: group_id,
				message: message
			};
			
			xmpp.sendMessage(to_id, JSON.stringify(data), "systemNotification", function() {
				$rootScope.$apply();
			});
		};

		return chat;
	});

})();
