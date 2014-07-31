app.controller( 'friendsController', function($state, userInfo, $scope, fileTransfer, friends, chat, search, settings) {
	$scope.groups = userInfo.groups;
	$scope.friends = friends.model;
	$scope.user = userInfo.user;
	$scope.search = search.model;
	$scope.settings = settings;
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
		search.model.setLocalSearch();
	};

	$scope.setRealmSearch = function(realm) {
		search.model.setRealmSearch(realm);
	};
	
	$scope.actionSendFileSelected = function(friend) {
		fileTransfer.openDialog().then(function(file) {
			fileTransfer.sendFiles(friend.id, [file]);
		});
	};

	$scope.clickOnFriend = function(friend) {
		var currentState = $state.current.name;
		if (friend.online || friend.mucOnline) {
			if (currentState === "chat" || currentState == "conference") {
				$scope.gotoState("chat");
				chat.model.setCurrent(friend.id);
			}
		}
	};

	$scope.addBestFriend = function(friend) {
		friends.addBestFriend(friend);
	};
	$scope.removeBestFriend = function(friend) {
		friends.removeBestFriend(friend);
	};
	$scope.removeTempFriend = function(friend) {
		friends.removeTempFriend(friend);
	};
	$scope.addBestFriendUWAP = function(friend) {
		$scope.showSearch = false;
		friends.addBestFriendUWAP(friend);
	};
	$scope.sendInvite = function(friend) {
		friends.sendInviteToSearchPerson(friend);
	};
	
	$scope.isBestFriend = function(friend) {
		if(!friend) {
			return false;
		}
		return $scope.friends.isBestFriend(friend.id);
	};

	$scope.tempFriendExists = function(friend) {
		if (friends.model.getWithUserid(friend.userid)) {
			friends.removeTempFriend(friend);
			return true;
		}
		else {
			return false;
		}
	};
	
	$scope.getBestFriends = function() {
		return $scope.friends.bestFriends.map(function(id) {
			return $scope.getFriendFromId(id);
		});
	};
	
	$scope.resetSearch = function() {
		$scope.setLocalSearch();
		$scope.search.query = '';
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

app.controller('friendSelectorController', function($scope,$modalInstance,data, $rootScope, friends){

	$scope.friends = friends.model.list;
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

