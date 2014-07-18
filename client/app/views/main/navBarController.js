app.controller( 'navBarController', function($scope, model, $state) {

	$scope.isActive = function(state) {
		var currentState = $state.current.name;
		if (currentState === "video.active") {
			currentState = "video";
		}
		if (state === currentState) {

			return true;
		} 
	};

	$scope.chat = model.chat;
	$scope.file = model.file;
	$scope.conference = model.conference;
});
