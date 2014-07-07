var mainView = angular.module( 'mainView', []);

app.config( function ($stateProvider) {
	$stateProvider.state('main', {
		parent: 'normal',
		views: {
			"view3-animated": {
				controller: "friendsController",
				templateUrl: "app/views/friends/friends.tpl.html"
			}
		}
	}).state('video', {
		parent: 'main',
		views: {
			"view2@normal": {
				controller: "videoController",
				templateUrl: "app/views/video/video.tpl.html"
			}
		}
	}).state('chat', {
		parent: 'main',
		views: {
			"view2-animated@normal": {
				controller: "chatController",
				templateUrl: "app/views/chat/chat.tpl.html"
			},
			"view1-animated@normal": {
				controller: "chatHistoryController",
				templateUrl: "app/views/chatHistory/chatHistory.tpl.html"
			}
		}
	}).state('file', {
		parent: 'main',
		views: {
			"view2-animated@normal": {
				controller: "fileController",
				templateUrl: "app/views/file/file.tpl.html"
			}
		}
	});
});
