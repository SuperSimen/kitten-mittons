app.controller( 'chatHistoryController', function($scope, model) {

	$scope.$watch(function () {return model.chat.currentId;}, function() {
		$scope.history = model.chat.sortableArray;

	});

	$scope.clickEntry = function(id) {
		model.chat.setCurrent(id);
	};

	$scope.isActive = function(id) {
		if (id === model.chat.currentId) {
			return true;
		}
		else {
			return false;
		}
	};
});
