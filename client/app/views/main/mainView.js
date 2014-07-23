var mainView = angular.module( 'mainView', []);

app.config( function ($stateProvider) {
	$stateProvider.state('friendsVisible', {
		parent: 'base',
		views: {
			"view3": {
				controller: "friendsController",
				templateUrl: "app/views/friends/friends.tpl.html"
			}
		}
	}).state('video', {
		url: '/call',
		parent: 'friendsVisible',
		views: {
			"view2@base": {
				controller: "videoController",
				templateUrl: "app/views/video/video.tpl.html"
			}
		}
	}).state('video.active', {
		views: {
			"view3@base": {
				controller: "chatController",
				templateUrl: "app/views/chat/chat.tpl.html"
			},
			"view2@base": {
				controller: "videoActiveController",
				templateUrl: "app/views/video/videoActive.tpl.html"
			},
		}
	}).state('chat', {
		url: '/chat',
		parent: 'friendsVisible',
		views: {
			"view2@base": {
				controller: "chatController",
				templateUrl: "app/views/chat/chat.tpl.html"
			},
			"view1@base": {
				controller: "chatHistoryController",
				templateUrl: "app/views/chatHistory/chatHistory.tpl.html"
			}
		}
	}).state('file', {
		parent: 'friendsVisible',
		url: '/file',
		views: {
			"view2@base": {
				controller: "fileController",
				templateUrl: "app/views/file/file.tpl.html"
			}
		}
	}).state('conference', {
		parent: 'friendsVisible',
		url: '/conference',
		views: {
			"view2@base": {
				controller: "conferenceController",
				templateUrl: "app/views/conference/conference.tpl.html"
			}
		}
	});
});
