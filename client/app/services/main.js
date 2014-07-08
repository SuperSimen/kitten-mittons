(function () {

	app.factory('main', function(UWAP, xmpp, model, $state, $rootScope, $http, constants, webrtc, fileSender, fileReceiver, $timeout, video) {
		var main = {
			init: function() {
				$state.go("chat");
				gatherInfoPart1();
				//fileSender.init();
				//fileReceiver.init();
			}
		};

		function gatherInfoPart1 () { 
			$http.get('/api/info').success(function(data, status) {
				model.user.info = data;
				model.user.token = data.token;

				if (model.user.info.xmpp.registered) {
					xmpp.connect(model.user.info.xmpp.jid, model.user.info.xmpp.password, constants.xmpp.boshUrl, connectedCallback);
				}

			}).error(failedHTTP);
			function failedHTTP(something, errorCode) {
				if (errorCode === 401) { $window.location.href = "/auth";}
				else {console.err("Failed to fetch http. Error: " + errorCode);}
				console.log(errorCode);
			}
		}

		function connectedCallback() {
			main.setVCard();
			webrtc.init();
			xmpp.addHandler(xmppHandlers.mucMessage, null, "message", "groupchat" );
			xmpp.addHandler(xmppHandlers.mucPresence, constants.xmpp.mucUser, "presence" );
			xmpp.addHandler(xmppHandlers.basicHandler);
			xmpp.addHandler(xmppHandlers.message, null, "message", "chat");
			
			gatherInfoPart2();
		}

		main.sendMessage = function(to, message) {
			var jid = to + "@" + constants.xmpp.serverUrl;
			xmpp.sendPrivateMessage(jid, message);
			model.chat.get(to).addMessage("Me", message);
		};


		var xmppHandlers = {
			basicHandler: function(data) {
				//console.log(data);
			},
			message: function(data) {
				var message = data.getChildrenByTagName("body")[0].children[0].data;
				var id = data.from.substring(0, data.from.indexOf("@"));

				$rootScope.$apply(function() {
					model.chat.get(id).addMessage(id, message);
				});
			},
			mucMessage: function(data) {
				console.log("received message");
				console.log(data);
			},
			mucMessage2: function(stanza) {
				if (stanza.getElementsByTagName("body")) {
					var message = stanza.getElementsByTagName("body")[0].innerHTML;
					var from = stanza.getAttribute("from");
					$rootScope.$apply(function () {
						model.chat.addMessage(from, message);
					});
				}
			},
			mucPresence: function(data) {
				var from = data.from;
				var groupId = from.substring(0, from.indexOf("@"));

				var x = data.getChildrenByTagName("x");
				if (x.length && x[0].xmlns === constants.xmpp.mucUser) {
					var item = x[0].getChildrenByTagName("item");
					if (item.length) {
						var jid = item[0].jid;
						if (jid) {
							$rootScope.$apply(function() {
								if (model.groups.list[groupId]) {
									var userName = jid.substring(0, jid.indexOf("@"));
									var friend = model.friends.list[userName];
									if (!friend) {
										friend = model.friends.create(userName);
										main.getVCard(jid.substring(0, jid.indexOf("/")));
									}
									model.groups.list[groupId].addFriend(friend);
									if (data.type === "unavailable") {
										friend.online = false;
									}
									else {
										friend.online = true;
									}
								}
							});
						}

						if (item[0].role === "moderator") {
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
							if (codes["110"] && !codes["100"]) {
								xmpp.sendRoomConfig(from.substring(0, from.indexOf("/")));
							}
						}
					}
				}
			}
		};


		function gatherInfoPart2 () {
			UWAP.getGroups(model.user.token, function (data) {
				var groups = data.Resources;
				for (var i in groups) {
					var group = groups[i];
					//Only for testing
					if (group.groupType === constants.uwap.adHoc ) {
						var userid = model.user.info.userid;
						var groupId = encodeURIComponent(group.id).toLowerCase();
						model.groups.create(groupId, group.displayName);
						xmpp.joinRoom(groupId, userid.substring(0,userid.indexOf("@")));
					}
				}
			}); 
			UWAP.getRealms(model.user.token, function (data) {
				model.user.realms = data;
			}); 
		}

		main.setVCard = function () {
			var properties = {};
			properties.FN = model.user.info.name;
			xmpp.setVCard(properties);
		};

		var vCardTimeout = {};
		main.getVCard = function (jid) {
			xmpp.getVCard(jid, function(stanza) {
				if (stanza.getElementsByTagName("FN")) {
					var userId = jid.substring(0, jid.indexOf("@"));
					$rootScope.$apply(function () {
						model.friends.list[userId].FN = stanza.getElementsByTagName("FN")[0].innerHTML;
					});
				}
			});
		};

		main.search = function() {
			if (!model.search.query) {return;}

			console.log("searching for " + model.search.query);

			UWAP.getPeople(model.user.token, (function(searchId) {
				return function (data) {
					if (data.people.length) {
						model.search.addPeopleToResults(data.people, searchId);
					}
				};
			})(model.search.getId()), model.search.currentRealm , model.search.query);
		};

		return main;
	});

})();
