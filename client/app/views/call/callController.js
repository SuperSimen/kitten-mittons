app.controller( 'callController', function(call, $scope, callVideo) {
	$scope.smallVideo = callVideo.local;
	$scope.largeVideo = callVideo.remote;
	$scope.video = callVideo;

	$scope.inverse = false;
	$scope.switchVideos = function() {
		if ($scope.inverse) {
			$scope.smallVideo = callVideo.local;
			$scope.largeVideo = callVideo.remote;
		}
		else {
			$scope.smallVideo = callVideo.remote;
			$scope.largeVideo = callVideo.local;
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
