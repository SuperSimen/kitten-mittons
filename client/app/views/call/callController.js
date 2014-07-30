app.controller( 'callController', function(model, call, $scope) {
	$scope.smallVideo = call.model.video.local;
	$scope.largeVideo = call.model.video.remote;
	$scope.video = call.model.video;

	$scope.inverse = false;
	$scope.switchVideos = function() {
		if ($scope.inverse) {
			$scope.smallVideo = call.model.video.local;
			$scope.largeVideo = call.model.video.remote;
		}
		else {
			$scope.smallVideo = call.model.video.remote;
			$scope.largeVideo = call.model.video.local;
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
