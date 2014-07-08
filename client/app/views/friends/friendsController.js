app.controller( 'friendsController', function($scope, model) {
	$scope.groups = model.groups;

	$scope.setCurrentConversation = function(friend) {
		model.chat.setCurrent(friend.id);
	};
});
