app.controller( 'chatController', function($state, $scope, main, model, utility, fileDialog, dialogs) {
	
	$scope.call = model.call;
	$scope.video = model.video;
	$scope.conference = model.conference;
	$scope.file = model.file;
		
	$scope.$watch(function () {return model.chat.currentId;}, function() {
		$scope.currentChat = model.chat.getCurrent();
		if($scope.currentChat && $scope.currentChat.conferenceOpen && model.conference.mediaActive) {
			$scope.gotoState("conference");
		}
	});

	$scope.openConference = function() {
		model.conference.mediaActive = true;
		
		var chat = $scope.currentChat;
		
		chat.openConference();
		
		for(var i in chat.participants) {
			main.sendSystemNotification(chat.participants[i].id, chat.id, $scope.getMe().name + " went into the video conference");
		}
		
		$scope.gotoState("conference");
	};


	$scope.openFriendSelector = function() {
		var dlg = dialogs.create('/dialogs/friendSelector.html','friendSelectorController', {}, 'lg');
		
		dlg.result.then(function(selectedFriends){
			for (var i in selectedFriends) {
				if (selectedFriends[i]) {
					main.sendRoomInvite(model.friends.get(i), $scope.currentChat.id);
				}
			}
		}, function(){
			console.log(arguments);
		});
	};

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
		else if ($scope.hasIncomingCall()) {
			if (!model.call.list[$scope.currentChat.id].video) {
				$scope.acceptCall();
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
		else if ($scope.hasIncomingCall()) {
			if (model.call.list[$scope.currentChat.id].video) {
				$scope.acceptCall();
			}
		}
		else {
			videoCall();
		}
	};

	$scope.isVideoButtonActive = function() {
		if ($scope.hasIncomingCall()) {
			if (model.call.list[$scope.currentChat.id].video) {
				return true;
			}
		}

		if($scope.isInCall() || $scope.isCalling()) {
			if (model.call.getCurrent().video) {
				return true;
			}
		}
		return false;
	};

	$scope.isAudioButtonActive = function() {
		if ($scope.hasIncomingCall()) {
			if (!model.call.list[$scope.currentChat.id].video) {
				return true;
			}
		}

		if($scope.isInCall() || $scope.isCalling()) {
			if (!model.call.getCurrent().video) {
				return true;
			}
		}
		return false;
	};

	$scope.getVideoControlMsg = function() {
		if ($scope.hasIncomingCall()) {
			if (model.call.list[$scope.currentChat.id].video) {
				return "Accept Video Call";
			}
		}

		if($scope.isInCall() || $scope.isCalling()) {
			if (model.call.getCurrent().video) {
				return "Stop Video Call";
			}
		}
		return "Video Call";
		
	};

	$scope.getAudioControlMsg = function() {
		if ($scope.hasIncomingCall()) {
			if (!model.call.list[$scope.currentChat.id].video) {
				return "Accept Audio";
			}
		}

		if($scope.isInCall() || $scope.isCalling()) {
			if (!model.call.getCurrent().video) {
				return "Stop Audio";
			}
		}
		return "Audio call";
	};

	$scope.hasTranferringFile = function() {
		if(!$scope.currentChat)
			return false;
		for(var file in $scope.file.list) {
			if(utility.getIdFromJid($scope.file.list[file].user) == $scope.currentChat.id) {
				return true;
			}
		}
		return false;
	};

	$scope.getFile = function(fileId) {
		return model.file.list[fileId];
	};

	$scope.showInfoBar = function() {
		return $scope.hasIncomingCall();
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
	
	$scope.sendFileToParticipants = function(file) {
		function sendFiles(p, file) {
			return function() {
				main.sendFiles(p.id, [file]);
			};
		}
		
		if(!$scope.currentChat) {
			return;
		}
		
		if(!$scope.currentChat.isRoom) {
			main.sendFiles($scope.currentChat.id, [file]);
		} else {
			
			for(var i in $scope.currentChat.participants) {
				
				var p = $scope.currentChat.participants[i];
				
				main.sendFileInvite(p.id, $scope.currentChat.id, file).then(sendFiles(p, file));
			}

			
			/*
			for(var i in $scope.currentChat.participants) {
				var p = $scope.currentChat.participants[i];
				main.sendFiles(p.id, [file]);
			}
			*/
		}
	};
	
	$scope.respondFileInvite = function(from_id, request_id, is_accepted) {
		main.respondFileInvite(
			from_id, 
			$scope.currentChat.id, 
			request_id, 
			is_accepted
		);
	};
	
	$scope.onDropFileCallback = function(file) {
		if($scope.currentChat) {
			$scope.sendFileToParticipants(file);
		}
	};
	
	$scope.sendFileRequest = function() {
		fileDialog.open().then(function(file) {
			$scope.sendFileToParticipants(file);
		});
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
		$scope.gotoState("call");
	};

	/**
	 * Checks whether the message was sent by current user
	 * @param {type} message
	 * @returns {Boolean}
	 */
	$scope.isMyMessage = function(message) {
		return $scope.isMe(message.from);
	};

	$scope.getColorId = function(message) {
		if($scope.currentChat.isRoom || !message) {
			
			var friend = $scope.getFriendFromId(message.from);
			
			if(!friend)
				return 0;
			
			var colorId = Object.keys($scope.currentChat.participants).indexOf(friend.id);
			return colorId == -1 ? 0 : colorId % 9;
		} else {
			return 0;
		}
	};

	$scope.getGroupRoomName = function() {
		
		if($scope.currentChat && $scope.currentChat.isRoom) {
			
			var arr = (function(obj) {
				var arr = [];
				for(var i in obj) {
					arr.push(obj[i]);
				}
				return arr;
			})($scope.currentChat.participants);
			
			var names = arr.filter(function(friend) {
				return !friend.isMe() && friend.isOnline();
			}).map(function(friend) {
				return friend.name;
			});

			if(names.length > 0) {
				return "Group room" + " with " + names.join(", ");			
			}
		}
		
		return "Empty group room";
		
	};

	/**
	 * Generates a display name from the message
	 * @param {type} message
	 * @returns {String} Display name
	 */
	$scope.getDisplayName = function(message) {
		var friend = $scope.getFriendFromId(message.from);
		if (friend) {
			return friend.name;
		}

		return message.from;
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
