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
	
	$scope.video = model.video.local;
	$scope.call = model.call;

	$scope.isSystemMessage = function(message) {
		return message.type == 'system';
	};
	
	/**
	 * Checks if we're currently in a call
	 * @returns {Boolean}
	 */
	$scope.isInCall = function() {
		return $scope.currentChat.id in $scope.call.list && 
				$scope.call.list[$scope.currentChat.id].hidden;
	};
	
	/**
	 * Checks if there's an incoming call
	 * @returns {Boolean}
	 */
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
	};
	
	$scope.onVideoUpdateAction = function() {
		
	};
	
	$scope.getVideoControlMsg = function() {
		
		if(!$scope.currentChat) {
			return "Start Video";
		}
		
		if($scope.isInCall() || $scope.calling()) {
			return "Stop Video";
		} else {
			return "Start Video";
		}
		
	};
	
	/**
	 * Check if we're currently calling
	 * @param {type} to
	 * @returns {Boolean}
	 */
	$scope.calling = function(to) {
		if(!model.call || !model.call.currentId)
			return false;
		return (model.call.status === "calling");
	};
	
	/**
	 * Send call request
	 * @returns {undefined}
	 */
	$scope.callTo = function() {
		systemMessage("Call request has been sent");
		main.call($scope.currentChat.id);
	};
	
	/**
	 * Stop call
	 * @param {type} to
	 * @returns {undefined}
	 */
	$scope.cancelCall = function() {
		systemMessage("Cancelled call request");
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
		systemMessage("");
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
