app.controller( 'friendsController', function(main, $state, $scope, model) {
	$scope.groups = model.groups;
	$scope.friends = model.friends;
	$scope.user = model.user;

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
				model.conference.addInvite(friend);
			}

		}
	};

	$scope.addBestFriend = function(friend) {
		main.addBestFriend(friend);
	};
	$scope.removeBestFriend = function(friend) {
		main.removeBestFriend(friend);
	};

	$scope.friendFieldValue = "owesenle@jabber.uninett.no";
	$scope.friendFieldKeyDown = function(event) {
		if (event.keyCode === 13 && $scope.friendFieldValue) {
			//main.addBestFriendJid($scope.friendFieldValue);
			$scope.showFriendField = false;
		}
	};
});
