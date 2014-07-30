(function () {

	app.factory('presence', function(xmpp, model, constants, $rootScope, utility) {
		var presence = {
			init: function() {
				xmpp.addHandler(xmppHandlers.mucPresence, constants.xmpp.mucUser, "presence");
				xmpp.addHandler(xmppHandlers.presence, constants.xmpp.client, "presence");
				xmpp.addHandler(xmppHandlers.roster, constants.xmpp.roster, "iq");
				
				presence.setVCard();
				xmpp.getRoster();
			}
		};

		var xmppHandlers = {
			
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

		presence.setVCard = function () {
			var properties = {};
			properties.name = model.user.info.name;
			properties.userid = model.user.info.userid;
			properties.nickname = model.user.info.nickname;
			xmpp.setVCard(properties);
		};

		presence.getVCard = function (jid) {
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
				presence.getVCard(utility.getJidFromId(id));
			}
			else {
				friend = model.friends.get(id);
			}
			return friend;
		}

		return presence;
	});

})();
