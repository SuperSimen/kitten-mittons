app.controller( 'friendsController', function(main, $state, $scope, model) {
	$scope.groups = model.groups;
	$scope.friends = model.friends;
	$scope.user = model.user;
	$scope.search = model.search;

	$scope.clickOnFriend = function(friend) {
		var currentState = $state.current.name;
		if (friend.online || friend.mucOnline) {
			if (currentState === "chat") {
				model.chat.setCurrent(friend.id);
			}
			else if (currentState === "file") {
				main.sendFile(friend.id);
			}
			else if (currentState === "video") {
				main.call(friend.id);
			}
			else if (currentState === "conference") {
				main.sendInvite(friend);
			}

		}
	};

	$scope.addBestFriend = function(friend) {
		main.addBestFriend(friend);
	};
	$scope.removeBestFriend = function(friend) {
		main.removeBestFriend(friend);
	};

	$scope.friendFieldKeyDown = function(event) {
	};
});
