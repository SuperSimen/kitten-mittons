app.controller( 'chatHistoryController', function($scope, model) {

	$scope.$watch(function () {return model.chat.currentId;}, function() {
		$scope.history = model.chat.sortableArray;

	});

	$scope.clickEntry = function(id) {
		console.log("clicke on " + id);
		model.chat.setCurrent(id);
	};
});
