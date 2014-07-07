app.controller( 'videoController', function(video, model, $scope) {
	if (!model.video.src) {
		video.init();
	}
	$scope.video = model.video;
});
