var mainView = angular.module( 'mainView', []);

app.config( function ($stateProvider) {
	$stateProvider.state('standard', {
		parent: 'base',
		views: {
			"view1": {
				controller: "chatHistoryController",
				templateUrl: "app/views/chatHistory/chatHistory.tpl.html"
			},
			"view3": {
				controller: "friendsController",
				templateUrl: "app/views/friends/friends.tpl.html"
			},
		}
	}).state('chat', {
		parent: 'standard',
		views: {
			"view2@base": {
				controller: "chatController",
				templateUrl: "app/views/chat/chat.tpl.html"
			},
		}
	}).state('conference', {
		parent: 'standard',
		views: {

		}
	}).state('call', {
		parent: "base",
		views: {
			"view2@base": {
				controller: "videoActiveController",
				templateUrl: "app/views/video/videoActive.tpl.html"
			},
		}
	});
});
