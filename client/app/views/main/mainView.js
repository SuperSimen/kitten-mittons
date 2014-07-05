var mainView = angular.module( 'mainView', []);

app.config( function ($stateProvider) {
	$stateProvider.state('subFriends', {
		parent: 'friends',
		views: {
			"friends": {
				templateUrl: "app/views/friends/friends.tpl.html"
			}
		}
	}).state('friends', {
		parent: 'normal',
		views: {
			"friends": {
				controller: "friendsController",
				templateUrl: "app/views/friends/friends.tpl.html"
			}
		}
	});
});
