(function () {
	
	app.factory('main', function(UWAP, xmpp, model, $state, $rootScope, $http, constants, webrtc, filesharing, $timeout) {
		var main = {
			init: function() {
				$state.go("normal");
				gatherInfoPart1();
				filesharing.init();
			}
		};

		function connectedCallback() {
			main.setVCard();
			webrtc.init();
			xmpp.addMucPresenceHandler(function (stanza) {
				var from = stanza.getAttribute("from");
				if (!model.friends.list[from]) {
					model.friends.create(from);	
					$timeout(function() {
						main.getVCard(from);

					},500);
				}
				$rootScope.$apply(function() {
					if (stanza.getAttribute("type") === "unavailable") {
						model.friends.list[from].online = false;
					}
					else {
						model.friends.list[from].online = true;
					}
				});

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
			var userid = model.userInfo.data.userid;
			xmpp.joinRoom("temp",userid.substring(0,userid.indexOf("@")));
		}

		function gatherInfoPart1 () { 
			$http.get('/api/info').success(function(data, status) {
				model.userInfo.data = data;
				model.auth.token = data.token;

				if (model.userInfo.data.xmpp.registered) {
					xmpp.connect(model.userInfo.data.xmpp.jid, model.userInfo.data.xmpp.password, constants.boshUrl, connectedCallback);
				}

				gatherInfoPart2();
			}).error(failedHTTP);
			function failedHTTP(something, errorCode) {
				if (errorCode === 401) { $window.location.href = "/auth";}
				else {console.err("Failed to fetch http. Error: " + errorCode);}
				console.log(errorCode);
			}
		}

		function gatherInfoPart2 () {
			UWAP.getGroups(model.auth.token, function (data) {
				model.auth.groups = data.Resources;

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
			if (vCardTimeout[jid] && vCardTimeout[jid].timeout) {
				$timeout.cancel(vCardTimeout[jid].timeout);
			}

			xmpp.getVCard(jid, function(stanza) {
				console.log("Received vCard from " + jid);
				if (stanza.getElementsByTagName("FN")) {
					$rootScope.$apply(function () {
						model.friends.list[jid].FN = stanza.getElementsByTagName("FN")[0].innerHTML;
					});
				}

				if (vCardTimeout[jid].timeout) {
					vCardTimeout[jid].counter = 0;	
					$timeout.cancel(vCardTimeout[jid].timeout);
				}
			});


			if (!vCardTimeout[jid]) {
				vCardTimeout[jid] = {
					counter: 0
				};
			}
			vCardTimeout[jid].timeout = $timeout(function() {
				if ( vCardTimeout[jid].counter >= 5 ) {
					return console.log("Giving up vCard");
				}
				vCardTimeout[jid].counter++;
				console.log("trying vCard again");
				main.getVCard(jid);
			}, 200);

		};


		main.getGroupMembers = function (groupId) {
			if (!model.auth.token) {
				console.error("No token");
				return;
			}
			if (getGroupWithId(groupId).members) {
				console.log("Already got group members");
				return;
			}
			UWAP.getGroupMembers(model.auth.token, groupId, function (data) {
				console.log("group members for group: " + groupId);
				console.log(data.items);
				addMembersToGroupWithId(groupId, data.items);	
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

		function getGroupWithId(id) {
			for (var i in model.auth.groups) {
				if (model.auth.groups[i].id === id) {
					return model.auth.groups[i];
				}
			}
		}
		function getGroupWithGroupType(groupType) {
			for (var i in model.auth.groups) {
				if (model.auth.groups[i].groupType === groupType) {
					return model.auth.groups[i];
				}
			}

		}
		function addMembersToGroupWithId(id, members) {
			for (var m in model.auth.groups) {
				if (model.auth.groups[m].id === id) {
					model.auth.groups[m].members = members;
					return;
				}
			}
		}


		return main;
	});

})();
