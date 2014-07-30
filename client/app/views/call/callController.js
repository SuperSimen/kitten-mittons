app.controller( 'callController', function(model, call, $scope) {
	$scope.smallVideo = model.video.local;
	$scope.largeVideo = model.video.remote;
	$scope.video = model.video;

	$scope.inverse = false;
	$scope.switchVideos = function() {
		if ($scope.inverse) {
			$scope.smallVideo = model.video.local;
			$scope.largeVideo = model.video.remote;
		}
		else {
			$scope.smallVideo = model.video.remote;
			$scope.largeVideo = model.video.local;
		}
		$scope.inverse = !$scope.inverse;
	};
	$scope.hangup = function() {
		call.hangup();
	};
	$scope.toggleVideo = function() {
		call.toggleVideo();
	};
	$scope.toggleAudio = function() {
		call.toggleAudio();
	};
	
	$scope.returnToChat = function() {
		$scope.gotoState("chat");
	};
	
});
