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
				model.userInfo.data = data;
				model.auth.token = data.token;

				if (model.userInfo.data.xmpp.registered) {
					xmpp.connect(model.userInfo.data.xmpp.jid, model.userInfo.data.xmpp.password, constants.boshUrl, connectedCallback);
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
			xmpp.addMucPresenceHandler(function (stanza) {
				console.log(stanza);
				globalStanza = stanza;
				var from = stanza.getAttribute("from");
				var groupId = from.substring(0, from.indexOf("@"));

				var x = stanza.getElementsByTagName("x").item();
				if (x.getAttribute("xmlns") === xmpp.api.mucUser) {
					var item = x.getElementsByTagName("item").item();
					if (item) {
						var jid = item.getAttribute("jid");
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
									if (stanza.getAttribute("type") === "unavailable") {
										friend.online = false;
									}
									else {
										friend.online = true;
									}
								}
							});
						}

						if (item.getAttribute("role") === "moderator") {
							var statuses = x.getElementsByTagName("status");

							var codes = {};
							globalStatus = statuses;
							for (var i = 0; i < statuses.length; i++) {
								if (statuses[i]) {
									var code = statuses[i].getAttribute("code");
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

				return true;
			});
			xmpp.addMucMessageHandler(function (stanza) {
				console.log(stanza);
				if (stanza.getElementsByTagName("body")) {
					var message = stanza.getElementsByTagName("body")[0].innerHTML;
					var from = stanza.getAttribute("from");
					$rootScope.$apply(function () {
						model.chat.addMessage(from, message);
					});
				}
				return true;
			});

			gatherInfoPart2();
		}


		function gatherInfoPart2 () {
			UWAP.getGroups(model.auth.token, function (data) {
				model.auth.groups = data.Resources;
				for (var i in model.auth.groups) {
					var group = model.auth.groups[i];
					//Only for testing
					if (group.groupType === constants.uwap.adHoc ) {
						var userid = model.userInfo.data.userid;
						var groupId = encodeURIComponent(group.id).toLowerCase();
						model.groups.create(groupId, group.displayName);
						xmpp.joinRoom(groupId, userid.substring(0,userid.indexOf("@")));
					}
				}

			}); 
			UWAP.getRealms(model.auth.token, function (data) {
				model.auth.realms = data;
			}); 
		}

		main.setVCard = function () {
			var properties = {};

			properties.FN = model.userInfo.data.name;

			xmpp.setVCard(properties);
		};

		var vCardTimeout = {};
		main.getVCard = function (jid) {
			console.log("getting vcard from " + jid);
			xmpp.getVCard(jid, function(stanza) {
				console.log("Received vCard from " + jid);
				console.log(stanza);
				if (stanza.getElementsByTagName("FN")) {
					console.log("fn");
					console.log(jid);
					var userId = jid.substring(0, jid.indexOf("@"));
					console.log(userId);
					$rootScope.$apply(function () {
						console.log(model.friends);
						console.log(userId);
						model.friends.list[userId].FN = stanza.getElementsByTagName("FN")[0].innerHTML;
					});
				}
			});
		};

		main.search = function() {
			if (!model.search.query) {return;}

			console.log("searching for " + model.search.query);

			UWAP.getPeople(model.auth.token, (function(searchId) {
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
