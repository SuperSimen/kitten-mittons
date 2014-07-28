app.controller( 'mainController', function($scope, model, $state, utility) {

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

	$scope.getCol = function(viewNumber) {
		var state = $state.current.name;
		return stateViewCols[state][viewNumber - 1];
	};
	$scope.isViewAnimated = function(viewNumber) {
		var state = $state.current.name;
		if (state == "video.active") {
			if (viewNumber === 2) {
				return false;
			}
		}
		return false;
	};
	$scope.getFriendFromId = function(id) {
		if (!id) {
			return;
		}
		id = utility.getBareJid(id);
		return model.friends.get(id);
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

