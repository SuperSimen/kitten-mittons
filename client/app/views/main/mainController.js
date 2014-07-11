app.controller( 'mainController', function($scope, model, $state) {
	$scope.video = model.video;

	var stateViewCols = {
		file: [
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
		]
	};
	$scope.getCol = function(viewNumber) {
		var state = $state.current.name;
		return stateViewCols[state][viewNumber - 1];
	};
	$scope.getFriendFromId = function(id) {
		if (!id) {
			return;
		}
		if (id.indexOf("@") != -1) {
			id = id.substring(0, id.indexOf("@"));
		}
		return model.friends.list[id];
	};
});
