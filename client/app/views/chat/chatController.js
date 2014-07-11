app.controller( 'chatController', function($state, $scope, main, model) {
	if ($state.current.name === "video.active") {
		$scope.border = "border-left";
		$scope.currentChat = model.chat.get(model.video.remote.userId);
	}
	else {
		$scope.$watch(function() {return model.chat.currentChatId;}, function(newValue) {
			$scope.$watch(function () {return model.chat.currentId;}, function() {
				$scope.currentChat = model.chat.getCurrent();
			});
		});
	}


	$scope.chatKeyDown = function(event) {
		if (event.keyCode === 13 && $scope.chatMessage && $scope.currentChat) {
			main.sendMessage($scope.currentChat.id, $scope.chatMessage);
			$scope.chatMessage = "";
		}
	};

	$scope.clickVideo = function() {
		main.call($scope.currentChat.id);
	};
});
