var app = angular.module( 'app', [
	'ui.router',
	'ngAnimate',
	'mainModule',
	'ng-context-menu',
	'dialogs.main'
]);
app.config( function ( $stateProvider) {
	$stateProvider.state('base', {
		controller: "mainController",
		templateUrl: "app/views/main/main.tpl.html"
	});
});

app.run( function (main) {
	main.init();
});

