app.controller( 'chatController', function($scope, main, model) {
	$scope.$watch(function() {return model.chat.currentChatId;}, function(newValue) {
		$scope.$watch(function () {return model.chat.currentId;}, function() {
			$scope.currentChat = model.chat.getCurrent();
		});

		console.log($scope.currentChat);
	});


	$scope.chatKeyDown = function(event) {
		if (event.keyCode === 13 && $scope.chatMessage && $scope.currentChat) {
			main.sendMessage($scope.currentChat.id, $scope.chatMessage);
			$scope.chatMessage = "";
		}
	};
});
