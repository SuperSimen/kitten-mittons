app.controller( 'fileController', function($scope, model, utility) {
	$scope.file = model.file;

	$scope.hideInfo = function() {
		
		if (Object.keys(model.file.list).length || Object.keys(model.file.log).length) {
			return true;
		}
		else {
			return false;
		}

	};

	$scope.bytesToSize = function(bytes) {
		return utility.bytesToSize(bytes, 2);
	};
});
