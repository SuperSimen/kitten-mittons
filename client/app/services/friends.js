(function () {

	app.factory('friends', function(xmpp, model, userInfo, $http, utility) {
		var friends = {};

		friends.model = {
			list: {},
			bestFriends: [],
			create: function(id) {
				if (!this.list[id]) {
					this.list[id] = {
						id: id,
						isOnline: function() {
							return (this.mucOnline || this.online);
						},
						isMe: function() {
							if (userInfo.user.info.xmpp && this.id === userInfo.user.info.xmpp.jid) {
								return true;
							}
							return false;
						}
					};
				}
				return this.list[id];
			},
			removeBestFriend: function(id) {
				for (var i in this.bestFriends) {
					if (this.bestFriends[i] === id) {
						this.bestFriends.splice(i,1);
						return;
					}
				}
			},
			addBestFriend: function(id) {
				for (var i in this.bestFriends) {
					if (this.bestFriends[i] === id) {
						return;
					}
				}
				this.bestFriends.push(id); 
			},
			isBestFriend: function(id) {
				for (var i in this.bestFriends) {
					if (this.bestFriends[i] === id) {
						return true;
					}
				}
				return false;
			},
			get: function(id) {
				return this.list[id];
			},
			getWithUserid: function(userid) {
				for (var i = 0; i < this.bestFriends.length; i++) {
					if (this.list[this.bestFriends[i]].userid === userid) {
						return this.list[this.bestFriends[i]];
					}
				}
			},
			getWithNickname: function(nickname) {
				for (var i in this.list) {
					if (this.list[i].nickname === nickname) {
						return this.list[i];
					}
				}
			},
			isUserAdded: function(userid) {
				return friends.model.getWithUserid(userid) !== undefined ||
						userInfo.user.info.tempFriends.filter(function(user) {
							return user.userid == userid;
						}).length;
			}
		};
		
		friends.sendInviteToSearchPerson = function(person) {
			if (person.o.toLowerCase() === "uninett") {
				var temp = {
					name: person.name,
					mail: person.mail,
					o: person.o,
					source: person.source,
					userid: person.userid
				};
				$http.post('/api/inviteUninettPerson', JSON.stringify(temp)).success(function(data, status) {
				}).error(utility.handleHttpError);
			}
		};

		friends.addBestFriend = function(friend) {
			var jid = utility.getJidFromId(friend.id);
			if (!friends.model.isBestFriend(friend.id)) {
				xmpp.addToRoster(jid, callback);
			}
			else {
				console.log("already best friend");
			}
			function callback() {
				xmpp.sendPresenceType(jid, "subscribe");
			}
		};

		friends.addBestFriendUWAP = function(person) {
			var temp = {
				name: person.name,
				mail: person.mail,
				o: person.o,
				source: person.source,
				userid: person.userid
			};
			$http.post('/api/addFriend', JSON.stringify(temp)).success(function(data, status) {
				userInfo.user.info = data;

			}).error(utility.handleHttpError);
		};

		friends.removeTempFriend = function(friend) {
			$http.post('/api/removeFriend', JSON.stringify(friend)).success(function(data, status) {
				userInfo.user.info = data;
			}).error(utility.handleHttpError);
		};

		friends.removeBestFriend = function(friend) {
			var jid = utility.getJidFromId(friend.id);
			if (friends.model.isBestFriend(friend.id)) {
				callback();
			}
			else {
				console.log("not best friend");
			}
			function callback() {
				xmpp.sendPresenceType(jid, "unsubscribe");
			}
		};

		return friends;
	});

})();
