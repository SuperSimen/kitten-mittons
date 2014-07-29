app.controller( 'mainController', function($scope, model, $state, utility) {

	$scope.$watch(function () {return model.video.active;}, function(newValue) {
		if (!newValue) {
			if ($state.current.name === "call") {
				$rootScope.gotoState("chat");
			}
		}
	});

	$scope.$watch(function () {return model.conference.active;}, function(newValue) {
		if (!newValue) {
			if ($state.current.name === "conference") {
				$rootScope.gotoState("chat");
			}
		}
	});

	$scope.getObjectLength = function(obj) {
		if (obj) {
			return Object.keys(obj).length;
		}
	};

	$scope.isMe = function(id) {
		if (utility.getIdFromJid(id) === model.user.info.xmpp.jid) {
			return true;
		}
		if (utility.getIdFromJid(id) === model.user.info.nickname) {
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
	$scope.conference = model.conference;
	$scope.showConference = function() {
		return $state.current.name === "conference";
	};
	$scope.closeConference = function() {
		model.conference.closeActive();
	};

	$scope.bytesToSize = function(bytes) {
		return utility.bytesToSize(bytes, 2);
	};

	$scope.getCol = function(viewNumber) {
		var state = $state.current.name;
		return stateViewCols[state][viewNumber - 1];
	};

	$scope.getFriendFromId = function(id) {
		if (!id) {
			return;
		}
		id = utility.getBareJid(id);

		var friend = model.friends.get(id);
		if (friend) {
			return friend;
		}

		friend = model.friends.getWithNickname(id);
		if (friend) {
			return friend;
		}
	};
	$scope.getMe = function() {
		return model.friends.get(model.user.info.xmpp.jid);
	};

	/**
	 * Checks if there's an incoming call request
	 * @returns {Boolean}
	 */
	$scope.receivingCall = function() {
		for(var i in model.call.list) {
			if(!model.call.list[i].calling && !model.call.list[i].hidden) {
				return true;
			}
		}
		return false;
	};


});

