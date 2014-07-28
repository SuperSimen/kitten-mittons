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
	
	/**
	 * Get number of groups
	 * @returns {Number}
	 */
	$scope.getNumGroups = function() {
		return Object.keys($scope.groups.list).length;
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
			if (currentState === "chat" || currentState == "conference") {
				$scope.gotoState("chat");
				model.chat.setCurrent(friend.id);
			}
			else if (currentState === "file") {
				main.sendFiles(friend.id);
			}
			else if (currentState === "video") {
				main.setupCall(friend.id);
			}
		}
	};

	$scope.openConference = function(conference) {
		conference.open();
		$scope.gotoState("conference");
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
		if(!friend) {
			return false;
		}
		return $scope.friends.isBestFriend(friend.id);
	};

	$scope.tempFriendExists = function(friend) {
		return model.friends.getWithUserid(friend.userid); 
	};

	$scope.signOff = function() {
		console.log("Signing off");
		main.logOff();
	};

});

app.controller('friendSelectorController', function($scope,$modalInstance,data, $rootScope, model){

	$scope.friends = model.friends.list;
	var selectedFriends = {};

	console.log($scope);

	$scope.isMe = $rootScope.isMe;


	$scope.toggleFriend = function(friend) {
		selectedFriends[friend.id] = !selectedFriends[friend.id];
	};
	$scope.isFriendSelected = function(friend) {
		return selectedFriends[friend.id];
	};

	$scope.accept = function(){
		$modalInstance.close(selectedFriends);
	};

	$scope.cancel = function(){
		$modalInstance.dismiss();
	}; 
});

