app.controller( 'videoController', function(model, $scope, main, utility) {
	$scope.video = model.video.local;
	$scope.call = model.call;

	$scope.hideInfo = function() {
		
		if (Object.keys(model.call.list).length) {
			return true;
		}
		else {
			return false;
		}

	};

	$scope.calling = function(to) {
		return (model.call.status === "calling" && model.call.currentId === utility.getIdFromJid(to));
	};
	$scope.callTo = function(to) {
		main.call(to);
	};
	$scope.cancelCall = function(to) {
		main.cancelCall(to);
	};

	$scope.acceptCall = function(to) {
		main.acceptCall(to);
	};

	$scope.denyCall = function(to) {
		main.denyCall(to);
	};

});
