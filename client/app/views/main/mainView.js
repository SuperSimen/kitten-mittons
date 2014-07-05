var mainView = angular.module( 'mainView', []);

app.config( function ($stateProvider) {
	$stateProvider.state('main', {
		parent: 'normal',
		views: {
			"friends": {
				controller: "friendsController",
				templateUrl: "app/views/friends/friends.tpl.html"
			}
		}
	}).state('video', {
		parent: 'main',
		views: {
			"video@normal": {
				controller: "videoController",
				templateUrl: "app/views/video/video.tpl.html"
			}
		}
	});
});
