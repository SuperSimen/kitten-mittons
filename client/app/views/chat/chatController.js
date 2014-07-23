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
	
	$scope.isVideoActive = false;
	$scope.video = model.video.local;
	$scope.call = model.call;

	$scope.isSystemMessage = function(message) {
		return message.type == 'system';
	};
	
	$scope.isInCall = function() {
		return $scope.currentChat.id in $scope.call.list && 
				$scope.call.list[$scope.currentChat.id].hidden;
	};
	
	$scope.hasIncomingCall = function() {
		return $scope.currentChat.id in $scope.call.list && 
				!$scope.call.list[$scope.currentChat.id].calling &&
				!$scope.call.list[$scope.currentChat.id].hidden;
	};

	$scope.video = model.video.local;
	$scope.videoSrc = model.video.remote;
	$scope.call = model.call;
	
	function systemMessage(message) {
		$scope.currentChat.messages.push({
			arrived: true,
			message: 'Info: ' + message,
			type: 'system',
			from: 'System'
		});
	}
	
	/**
	 * Check if we're currently calling
	 * @param {type} to
	 * @returns {Boolean}
	 */
	$scope.calling = function(to) {
		return (model.call.status === "calling" && model.call.currentId === utility.getIdFromJid(to));
	};
	
	/**
	 * Send call request
	 * @returns {undefined}
	 */
	$scope.callTo = function() {
		
		$scope.isVideoActive = true;
		
		systemMessage("Call request has been sent");
		
		/*
		$scope.currentChat.messages.push({
			arrived: true,
			message: "Video call accepted",
			type: 'system',
			from: 'System'
		});
		*/
	   
		main.call($scope.currentChat.id);
	};
	
	/**
	 * Stop call
	 * @param {type} to
	 * @returns {undefined}
	 */
	$scope.cancelCall = function() {
		systemMessage("Ending call");
		main.hangup();
	};

	/**
	 * Accept incoming call
	 * @returns {undefined}
	 */
	$scope.acceptCall = function() {
		systemMessage("Accepted the call request");
		main.acceptCall($scope.currentChat.id);
	};

	/**
	 * Reject call request
	 * @returns {undefined}
	 */
	$scope.rejectCall = function() {
		main.denyCall($scope.currentChat.id);
	};


	/**
	 * Checks whether the message was sent by current user
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
		var friend = $scope.getFriendFromId(message.from);
		return friend && friend.FN ? friend.FN : "Unknown";
	};

	/**
	 * Validate and try to send a new chat message
	 * @returns {undefined}
	 */
	$scope.sendMessage = function() {
		if($scope.chatMessage && $scope.currentChat) {
			if ($scope.currentChat.isRoom) {
				main.sendGroupMessage($scope.currentChat.id, $scope.chatMessage);
			}
			else {
				main.sendMessage($scope.currentChat.id, $scope.chatMessage);
			}
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
