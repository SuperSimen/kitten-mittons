(function () {

	app.factory('communincation', function(UWAP, xmpp, model, $state, $rootScope, $http, constants, webrtc, fileSender, fileReceiver, $timeout, utility, $sce) {
		function init() {

			main.setVCard();
			xmpp.addHandler(xmppHandlers.mucMessage, null, "message", "groupchat" );
			xmpp.addHandler(xmppHandlers.mucPresence, constants.xmpp.mucUser, "presence");
			xmpp.addHandler(xmppHandlers.basicHandler);
			xmpp.addHandler(xmppHandlers.message, null, "message", "chat");
			xmpp.addHandler(xmppHandlers.conferenceInvite, null, "message", "conferenceInvite");
			xmpp.addHandler(xmppHandlers.roomInvite, null, "message", "roomInvite");
			xmpp.addHandler(xmppHandlers.fileInvite, null, "message", "fileInvite");
			xmpp.addHandler(xmppHandlers.fileInviteResponse, null, "message", "fileInviteResponse");
			xmpp.addHandler(xmppHandlers.presence, constants.xmpp.client, "presence");
			xmpp.addHandler(xmppHandlers.roster, constants.xmpp.roster, "iq");
			xmpp.addHandler(xmppHandlers.systemNotification, null, "message", "systemNotification");

		}



		communincation.sendMessage = function(to, message) {
			var jid = utility.getJidFromId(to);
			var messageObject = model.chat.get(to).addMessage(model.user.info.xmpp.jid, message, true);

			xmpp.sendMessage(jid, message, "chat", function() {
				$rootScope.$apply(function() {
					messageObject.arrived = true;
				});
			});
		};


		main.sendGroupMessage = function(to, message) {
			xmpp.sendGroupMessage(to, message);
		};




		main.createRoom = function() {
			var id = model.chat.createRoom();
			xmpp.joinRoom(utility.getRoomIdFromJid(id));
		};

		main.closeChat = function(id) {
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
			basicHandler: function(data) {
				//console.log(data);
			},
			
			/**
			 * Receive a system notification
			 */
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
			roster: function(data) {
				var query = data.getChildrenByTagName("query")[0];
				var items = query.getChildrenByTagName("item");

				var bestFriends = [];
				for (var i in items) {
					var id = utility.getIdFromJid(items[i].jid);
					if (!model.friends.get(items[i])) {
						addFriend(id);
					}
					switch (items[i].subscription) {
						case "to":
							case "both":
							$rootScope.$apply(add(id));
							break;
						case "remove":
							case "none":
							case "from":
							$rootScope.$apply(remove(id));
							break;
					}
				}
				function add(id) {
					return function() {
						model.friends.addBestFriend(id);
					};
				}
				function remove(id) {
					return function() {
						model.friends.removeBestFriend(id);
					};
				}
			},
			presence: function(data) {
				if (data.type === "subscribe") {
					xmpp.sendPresenceType(data.from, "subscribed");
				}
				else if (data.type === "subscribed") {
				}
				else if (data.type === "unsubscribe") {
					xmpp.sendPresenceType(data.from, "unsubscribed");
				}
				else if (data.type === "unsubscribed") {
				}
				else if (data.to) {
					if (data.from.indexOf("conference") !== -1) {
						return;
					}
					var from = utility.getIdFromJid(data.from);
					var friend = model.friends.get(from);
					if (!friend) {
						friend = addFriend(from);
					}
					$rootScope.$apply(function() {
						if (data.type === "unavailable") {
							friend.online = false;
						}
						else {
							friend.online = true;
						}
					});
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
			mucPresence: function(data) {
				var from = data.from;
				var groupId = utility.getRoomIdFromJid(from);

				var x = data.getChildrenByTagName("x");
				if (x.length && x[0].xmlns === constants.xmpp.mucUser) {
					var item = x[0].getChildrenByTagName("item");

					var statuses = x[0].getChildrenByTagName("status");
					var codes = {};
					for (var i = 0; i < statuses.length; i++) {
						if (statuses[i]) {
							var code = statuses[i].code;
							if (code) {
								codes[code] = true;
							}
						}
					}

					if (item.length) {

						var jid = item[0].jid;
						if (jid) {
							$rootScope.$apply(function() {
								var userName, friend;
								if (model.groups.list[groupId] && data.to) {
									userName = utility.getIdFromJid(jid);
									friend = model.friends.get(userName);
									if (!friend) {
										friend = addFriend(userName);
									}
									model.groups.list[groupId].addFriend(friend);
									if (data.type === "unavailable") {
										friend.mucOnline = false;
									}
									else {
										friend.mucOnline = true;
									}
								}
								else if (model.chat.getWithGroupId(groupId)){
									userName = utility.getIdFromJid(jid);
									friend = model.friends.get(userName);
									if (!friend) {
										friend = addFriend(userName);
									}
									if (!codes["110"]) {
										if (data.type === "unavailable") {
											friend.mucOnline = false;
											model.chat.getWithGroupId(groupId).removeParticipant(friend);
										}
										else {
											friend.mucOnline = true;
											model.chat.getWithGroupId(groupId).addParticipant(friend);
										}
									}
								}
							});
						}

						if (item[0].role === "moderator") {
							if (codes["110"] && !codes["100"]) {
								xmpp.sendRoomConfig(utility.getBareJid(from));
							}
						}

					}
				}
			}
		};

		main.setVCard = function () {
			var properties = {};
			properties.name = model.user.info.name;
			properties.userid = model.user.info.userid;
			properties.nickname = model.user.info.nickname;
			xmpp.setVCard(properties);
		};

		main.getVCard = function (jid) {
			xmpp.getVCard(jid, function(stanza) {
				var userId = utility.getIdFromJid(jid);
				if (stanza.getElementsByTagName("name").length) {
					$rootScope.$apply(function () {
						model.friends.get(userId).name = stanza.getElementsByTagName("name")[0].innerHTML;
					});
				}
				if (stanza.getElementsByTagName("userid").length) {
					$rootScope.$apply(function () {
						model.friends.get(userId).userid = stanza.getElementsByTagName("userid")[0].innerHTML;
					});
				}
				if (stanza.getElementsByTagName("nickname").length) {
					$rootScope.$apply(function () {
						model.friends.get(userId).nickname = stanza.getElementsByTagName("nickname")[0].innerHTML;
					});
				}
			});
		};

		function addFriend(id) {
			var friend;
			if (!model.friends.get(id)) {
				friend = model.friends.create(id);
				main.getVCard(utility.getJidFromId(id));
			}
			else {
				friend = model.friends.get(id);
			}
			return friend;
		}

		

		main.sendRoomInvite = function(friend, roomId) {
			xmpp.sendMessage(friend.id, roomId, "roomInvite");
		};

		/**
		 * Send system notification message
		 * @param {type} friend
		 * @param {type} message
		 * @returns {undefined}
		 */
		main.sendSystemNotification = function(to_id, group_id, message) {
			
			var data = {
				chatId: group_id,
				message: message
			};
			
			xmpp.sendMessage(to_id, JSON.stringify(data), "systemNotification", function() {
				$rootScope.$apply();
			});
		};



		return main;
	});

})();
