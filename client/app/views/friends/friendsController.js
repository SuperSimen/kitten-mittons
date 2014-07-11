app.controller( 'friendsController', function(main, $state, $scope, model) {
	$scope.groups = model.groups;

	$scope.clickOnFriend = function(friend) {
		var currentState = $state.current.name;
		if (currentState === "chat") {
			model.chat.setCurrent(friend.id);
		}
		else if (currentState === "file") {
			main.sendFile(friend.id);
		}
		else if (currentState === "video") {
			main.call(friend.id);
		}

	};
});
