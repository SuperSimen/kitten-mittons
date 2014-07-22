app.controller( 'videoController', function(model, $scope, main) {
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

	$scope.callTo = function(to) {
		main.call(to);
	};

	$scope.acceptCall = function(to) {
		main.acceptCall(to);
	};

	$scope.denyCall = function(to) {
		main.denyCall(to);
	};
});
