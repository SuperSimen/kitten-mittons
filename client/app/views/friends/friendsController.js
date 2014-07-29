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

	$scope.setLocalSearch = function() {
		model.search.setLocalSearch();
	};

	$scope.setRealmSearch = function(realm) {
		model.search.setRealmSearch(realm);
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
	$scope.sendInvite = function(friend) {
		main.sendInviteToSearchPerson(friend);
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
	
	$scope.getBestFriends = function() {
		return $scope.friends.bestFriends.map(function(id) {
			return $scope.getFriendFromId(id);
		});
	};
	
	/**
	 * Check if we're currently filtering the friends list
	 * @returns {Boolean}
	 */
	$scope.isFiltering = function() {
		return !$scope.search.isRealmSearch && $scope.search.query.length > 0;
	};

	/**
	 * Filter friend by search query
	 * @param {type} friend
	 * @returns {Boolean}
	 */
	$scope.filterByQuery = function(friend) {
		var exp = new RegExp($scope.search.query, 'i');
		var ret = !$scope.isFiltering() ||
			exp.test(friend.name);
		return ret;
	};

});

/**
 * Object => array filter
 * @param {type} param1
 * @param {type} param2
 */
app.filter('array', function() {
	return function(items) {
		var filtered = [];
		angular.forEach(items, function(item) {
			filtered.push(item);
		});
		return filtered;
	};
});

app.controller('friendSelectorController', function($scope,$modalInstance,data, $rootScope, model){

	$scope.friends = model.friends.list;
	var selectedFriends = {};

	$scope.toggleFriend = function(friend) {
		selectedFriends[friend.id] = !selectedFriends[friend.id];
	};
	$scope.isFriendSelected = function(friend) {
		return selectedFriends[friend.id];
	};

	$scope.accept = function(){
		for (var i in selectedFriends) {
			if (!selectedFriends[i]) {
				delete selectedFriends[i];
			}
		}
		$modalInstance.close(selectedFriends);
	};

	$scope.cancel = function(){
		$modalInstance.dismiss();
	}; 
});

