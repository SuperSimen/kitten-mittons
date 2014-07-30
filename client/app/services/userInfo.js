(function () {

	app.factory('userInfo', function() {
		
		var userInfo = {};

		userInfo.user = {
			info: null,
			token: null,
			realms: null
		};

		userInfo.groups = {
			list: {},
			create: function(id, displayName) {
				if (!this.list[id]) {
					this.list[id] = {
						id: id,
						displayName: displayName,
						addFriend: function(friend) {
							if (!this.friends[friend.id]) {
								this.friends[friend.id] = friend;
							}
						},
						removeFriend: function(friend) {
							delete this.friends[friend.id];
						},
						friends: {}
					};
				}
				return this.list[id];
			}
		};

		return userInfo;
	});

})();
