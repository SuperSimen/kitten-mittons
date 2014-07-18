app.controller( 'videoController', function(model, $scope) {
	console.log("yes");
	$scope.video = model.video.local;
	console.log($scope.video);

});
