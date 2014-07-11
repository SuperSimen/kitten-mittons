var app = angular.module( 'app', [
	'ui.router',
	'ngAnimate',
	'mainView'
]);
app.config( function ( $stateProvider) {
	$stateProvider.state('base', {
		controller: "mainController",
		templateUrl: "app/views/main/main.tpl.html"
	});
});

app.run( function (main, $http) {
	main.init();
});

