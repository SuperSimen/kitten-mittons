var app = angular.module( 'app', [
  'ui.router',
  'ngAnimate'
]);
app.config( function ( $stateProvider) {
	$stateProvider.state('test', {
		views: {
			"main": {
				controller: "testController",
				templateUrl: "app/views/test/test.tpl.html"
			}
		}
	}).state('normal', {
		views: {
			"main": {
				controller: "mainController",
				templateUrl: "app/views/main/main.tpl.html"
			}
		}
	});
});

app.run( function (main, $http) {
	main.init();
});

