app.controller( 'friendsController', function(main, $state, $scope, model, fileDialog) {
	$scope.groups = model.groups;
	$scope.friends = model.friends;
	$scope.user = model.user;
	$scope.search = model.search;
	$scope.conference = model.conference;

	/**
	 * Get the number of friends in group
	 * @param {type} friends
	 * @returns {Number}
	 */
	$scope.groupMembersCount = function(friends) {
		return Object.keys(friends).length - 1;
	};
	
	$scope.actionCallSelected = function(friend) {
		console.log(friend);
	};
	
	$scope.actionSendFileSelected = function(friend) {
		fileDialog.open().then(function(file) {
			main.sendFiles(friend.id, [file]);
		});
	};

	$scope.clickOnFriend = function(friend) {
		var currentState = $state.current.name;
		if (friend.online || friend.mucOnline) {
			if (currentState === "chat") {
				model.chat.setCurrent(friend.id);
			}
			else if (currentState === "file") {
				main.sendFiles(friend.id);
			}
			else if (currentState === "video") {
				main.setupCall(friend.id);
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
	$scope.removeTempFriend = function(friend) {
		main.removeTempFriend(friend);
	};
	$scope.addBestFriendUWAP = function(friend) {
		$scope.showSearch = false;
		main.addBestFriendUWAP(friend);
	};
	
	$scope.isBestFriend = function(friend) {
		return $scope.friends.isBestFriend(friend.id);
	};

	$scope.tempFriendExists = function(friend) {
		return model.friends.getWithUserid(friend.userid); 
	};

});
