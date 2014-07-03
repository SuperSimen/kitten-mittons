var app = angular.module( 'app', [
  'ui.router'
]);
app.config( function ( $stateProvider) {
	$stateProvider.state('normal', {
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

