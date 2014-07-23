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

        /**
         * Checks whether the message was sent by me
         * @param {type} message
         * @returns {Boolean}
         */
        $scope.isMyMessage = function(message) {
            return $scope.isMe(message.from);
        };

        /**
         * Generates a display name from the message
         * @param {type} message
         * @returns {String} Display name
         */
        $scope.getDisplayName = function(message) {
            return $scope.getFriendFromId(message.from).FN;
        };

        /**
         * Validate and try to send a new chat message
         * @returns {undefined}
         */
        $scope.sendMessage = function() {
            if($scope.chatMessage && $scope.currentChat) {
                main.sendMessage($scope.currentChat.id, $scope.chatMessage);
                $scope.chatMessage = "";
            }
        };

	$scope.chatKeyDown = function(event) {
		if (event.keyCode === 13) {
                    $scope.sendMessage();
		}
	};

	$scope.clickVideo = function() {
		main.call($scope.currentChat.id);
	};
});
