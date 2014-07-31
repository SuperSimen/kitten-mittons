var app = angular.module( 'app', [
	'ui.router',
	'ngAnimate',
	'ng-context-menu',
	'dialogs.main'
]);
app.controller('appController', function($rootScope, $window) {
	$rootScope.application = {
		standard: "UNINETT WebRTC application",
		title: this.standard,
		resetTitle: function() {
			this.count = 0;
			this.title = this.standard;
		},
		setTitle: function() {

		},
		count: 0,
		ping: function() {
			if (this.focus) {
				return;
			}
			this.title = "(" + (++this.count) + ")" + " - " + this.standard;
		},
		focus: true,
	};

	$window.onblur = function() {
		$rootScope.$apply(function() {
			$rootScope.application.focus = false;
		});
	};
	$window.onfocus = function() {
		$rootScope.$apply(function() {
			$rootScope.application.focus = true;
		});
	};

	$rootScope.$watch(function() {return $rootScope.application.focus;}, function(newValue) {
		if (newValue) {
			$rootScope.application.resetTitle();
		}
	});
});
app.config( function ( $stateProvider) {
	$stateProvider.state('base', {
		controller: "mainController",
		templateUrl: "app/views/main/main.tpl.html"
	}).state('standard', {
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
	}).state('conference.fullscreen', {
		parent: 'standard',
		views: {

		}
	}).state('call', {
		parent: "base",
		views: {
			"view2@base": {
				controller: "callController",
				templateUrl: "app/views/call/call.tpl.html"
			},
		}
	});
});

app.run( function (initialize) {
	initialize.init();
});
