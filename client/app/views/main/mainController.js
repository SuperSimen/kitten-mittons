app.controller( 'mainController', function($scope, $rootScope, friends, $state, utility, call, callModel, chat) {

	$scope.$watch(function () {return callModel.video.active;}, function(newValue) {
		if (!newValue) {
			if ($state.current.name === "call") {
				$rootScope.gotoState("chat");
			}
		}
	});

	$scope.toggleConferenceFullscreen = function() {
		if ($state.current.name === "conference.fullscreen") {
			$rootScope.gotoState("conference");
		}
		else if ($state.current.name === "conference") {
			$rootScope.gotoState("conference.fullscreen");
		}
		else {
			console.error("tried to toggle conference fullscreen with no conference");
		}
	};

	$scope.isConferenceFullscreen = function() {
		return $state.current.name === "conference.fullscreen";
	};


	$scope.$watch(function () {return chat.model.conference.active;}, function(newValue) {
		if (!newValue) {
			if ($state.current.name === "conference" || $state.current.name === "conference.fullscreen") {
				$rootScope.gotoState("chat");
			}
		}
	});

	$rootScope.getObjectLength = function(obj) {
		if (obj) {
			return Object.keys(obj).length;
		}
	};

	$rootScope.isMe = function(id) {
		if (utility.getIdFromJid(id) === userInfo.user.info.xmpp.jid) {
			return true;
		}
		if (utility.getIdFromJid(id) === userInfo.user.info.nickname) {
			return true;
		}
		return false;
	};


	var stateViewCols = {
		chat: [
			"col-xs-2",
			"col-xs-8",
			"col-xs-2",
		],
		"conference": [
			"col-xs-2",
			"col-xs-8",
			"col-xs-2",
		],
		"conference.fullscreen": [
			"hidden",
			"col-xs-12",
			"hidden"
		],
		"call": [
			"hidden",
			"col-xs-12",
			"hidden"
		],
	};
	$scope.conference = chat.model.conference;
	$scope.showConference = function() {
		return $state.current.name === "conference" || $state.current.name === "conference.fullscreen";
	};
	$scope.closeConference = function() {
		chat.model.conference.closeActive();
	};

	$rootScope.bytesToSize = function(bytes) {
		return utility.bytesToSize(bytes, 2);
	};

	$scope.getCol = function(viewNumber) {
		var state = $state.current.name;
		return stateViewCols[state][viewNumber - 1];
	};

	$rootScope.getFriendFromId = function(id) {
		if (!id) {
			return;
		}
		id = utility.getBareJid(id);

		var friend = friends.model.get(id);
		if (friend) {
			return friend;
		}

		friend = friends.model.getWithNickname(id);
		if (friend) {
			return friend;
		}
	};
	$rootScope.getMe = function() {
		return friends.model.get(model.user.info.xmpp.jid);
	};

	/**
	 * Checks if there's an incoming call request
	 * @returns {Boolean}
	 */
	$scope.receivingCall = function() {
		for(var i in callModel.list) {
			if(!callModel.list[i].calling && !callModel.list[i].hidden) {
				return true;
			}
		}
		return false;
	};


});

