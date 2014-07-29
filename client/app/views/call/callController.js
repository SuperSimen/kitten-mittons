app.controller( 'callController', function(model, main, $scope) {
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
		main.hangup();
		//$scope.returnToChat();
	};
	$scope.toggleVideo = function() {
		main.toggleVideo();
	};
	$scope.toggleAudio = function() {
		main.toggleAudio();
	};
	
	$scope.returnToChat = function() {
		$scope.gotoState("chat");
	};
	
});
