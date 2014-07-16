app.controller( 'navBarController', function($scope, model, $state) {
	$scope.gotoState = function(state) {

		if (state === "chat") {
			model.chat.unread = 0;
		}
		if (state === "file") {
			model.file.unseen = 0;
		}
		if (state === "conference") {
			model.conference.unseen = 0;
		}

		if (state === "video") {
			if (model.video.remote.src) {
				$state.go("video.active");
			}
			else {
				$state.go("video");
			}
		}
		else {
			$state.go(state);
		}
	};

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
