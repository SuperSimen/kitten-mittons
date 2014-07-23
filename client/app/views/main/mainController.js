app.controller( 'mainController', function($scope, model, $state, utility) {

	var stateViewCols = {
		file: [
			"hidden",
			"col-xs-10",
			"col-xs-2",
		],
		conference: [
			"hidden",
			"col-xs-10",
			"col-xs-2",
		],
		chat: [
			"col-xs-2",
			"col-xs-8",
			"col-xs-2",
		],
		video: [
			"hidden",
			"col-xs-10",
			"col-xs-2",
		],
		"video.active": [
			"hidden",
			"col-xs-10",
			"col-xs-2",
		],
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
		return true;

	};
	$scope.getFriendFromId = function(id) {
		if (!id) {
			return;
		}
		id = utility.getBareJid(id);
		return model.friends.get(id);
	};
	

});

