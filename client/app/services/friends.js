(function () {

	app.factory('friends', function(xmpp, model, $http, utility) {
		var friends = {};
		
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
			if (!model.friends.isBestFriend(friend.id)) {
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
				model.user.info = data;

			}).error(utility.handleHttpError);
		};

		friends.removeTempFriend = function(friend) {
			$http.post('/api/removeFriend', JSON.stringify(friend)).success(function(data, status) {
				model.user.info = data;
			}).error(utility.handleHttpError);
		};

		friends.removeBestFriend = function(friend) {
			var jid = utility.getJidFromId(friend.id);
			if (model.friends.isBestFriend(friend.id)) {
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
