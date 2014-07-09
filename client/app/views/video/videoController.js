app.controller( 'videoController', function(video, model, $scope) {
	if (!model.video.local) {
		//video.init();
	}
	$scope.video = model.video;
});
