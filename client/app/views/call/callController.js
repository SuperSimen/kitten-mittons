app.controller( 'callController', function(call, $scope, callModel) {
	$scope.smallVideo = callModel.video.local;
	$scope.largeVideo = callModel.video.remote;
	$scope.video = callModel.video;

	$scope.inverse = false;
	$scope.switchVideos = function() {
		if ($scope.inverse) {
			$scope.smallVideo = callModel.video.local;
			$scope.largeVideo = callModel.video.remote;
		}
		else {
			$scope.smallVideo = callModel.video.remote;
			$scope.largeVideo = callModel.video.local;
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
