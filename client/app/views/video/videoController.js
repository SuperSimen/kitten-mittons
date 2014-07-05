app.controller( 'videoController', function(video, model, $scope) {
	video.init();
	$scope.video = model.video;
});
