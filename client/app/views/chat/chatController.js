
app.controller( 'chatController', function($state, $scope, main, model, utility) {
	
	$scope.call = model.call;
	$scope.video = model.video;

	$scope.file = model.file;
		
	$scope.$watch(function () {return model.chat.currentId;}, function() {
		$scope.currentChat = model.chat.getCurrent();
	});

	$scope.clickAudioButton = function() {
		if ($scope.isInCall()) {
			if (!model.call.getCurrent().video) {
				hangup();
			}
		}
		else if ($scope.isCalling()){
			if (!model.call.getCurrent().video) {
				cancelCall();
			}
		}
		else {
			audioCall();
		}
	};

	$scope.clickVideoButton = function() {
		if ($scope.isInCall()) {
			if (model.call.getCurrent().video) {
				hangup();
			}
		}
		else if ($scope.isCalling()){
			if (model.call.getCurrent().video) {
				cancelCall();
			}
		}
		else {
			videoCall();
		}
	};

	$scope.isVideoButtonActive = function() {
		if($scope.isInCall() || $scope.isCalling()) {
			if (model.call.getCurrent().video) {
				return true;
			}
		}
		return false;
	};
	$scope.isAudioButtonActive = function() {
		if($scope.isInCall() || $scope.isCalling()) {
			if (!model.call.getCurrent().video) {
				return true;
			}
		}
		return false;
	};

	$scope.getVideoControlMsg = function() {
		if($scope.isInCall() || $scope.isCalling()) {
			if (model.call.getCurrent().video) {
				return "Stop Video";
			}
		}
		return "Start Video";
		
	};

	$scope.getAudioControlMsg = function() {
		if($scope.isInCall() || $scope.isCalling()) {
			if (!model.call.getCurrent().video) {
				return "Stop Audio";
			}
		}
		return "Start Audio";
	};

	$scope.hasTranferringFile = function() {
		for(var file in $scope.file.list) {
			if(utility.getIdFromJid($scope.file.list[file].user) == $scope.currentChat.id) {
				return true;
			}
		}
		return false;
	};

	$scope.showInfoBar = function() {
		return $scope.hasIncomingCall() || $scope.hasTranferringFile();
	};

	$scope.isSystemMessage = function(message) {
		return message.type == 'system';
	};
	
	/**
	 * Checks if we're currently in a call
	 * @returns {Boolean}
	 */
	$scope.isInCall = function() {
		return $scope.currentChat && $scope.currentChat.id in $scope.call.list && 
				$scope.call.list[$scope.currentChat.id].hidden;
	};
	
	/**
	 * Checks if there's an incoming call
	 * @returns {Boolean}
	 */
	$scope.hasIncomingCall = function() {
		return $scope.currentChat && $scope.currentChat.id in $scope.call.list && 
				!$scope.call.list[$scope.currentChat.id].calling &&
				!$scope.call.list[$scope.currentChat.id].hidden;
	};

	
	function systemMessage(message) {
		$scope.currentChat.addSystemMessage(message);
	}
	
	$scope.onVideoUpdateAction = function() {
		
	};
	
	
	/**
	 * Check if we're currently calling
	 * @param {type} to
	 * @returns {Boolean}
	 */
	$scope.isCalling = function() {
		if(!model.call || !model.call.currentId) {
			return false;
		}
		return (model.call.status === "calling");
	};
	
	/**
	 * Send call request
	 * @returns {undefined}
	 */
	function videoCall() {
		systemMessage("Call request has been sent");
		main.videoCall($scope.currentChat.id);
	}

	function audioCall() {
		systemMessage("Call request has been sent");
		main.audioCall($scope.currentChat.id);
	}
	
	/**
	 * Cancel call request
	 * @returns {undefined}
	 */
	function cancelCall () {
		systemMessage("Cancelled call request");
		main.cancelCall($scope.currentChat.id);
	}
	
	/**
	 * End call
	 * @returns {undefined}
	 */
	function hangup () {
		systemMessage("Ended call");
		main.hangup();
	}

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
		systemMessage("Call rejected");
		main.denyCall($scope.currentChat.id);
	};

	$scope.enterVideoFull = function() {
		$scope.gotoState("video");
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
		return friend && friend.name ? friend.name : "Unknown";
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
