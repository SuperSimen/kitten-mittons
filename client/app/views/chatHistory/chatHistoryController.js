app.controller( 'chatHistoryController', function($scope, main, model) {

	$scope.$watch(function () {return model.chat.currentId;}, function() {
		$scope.history = model.chat.sortableArray;

	});

	$scope.clickEntry = function(id) {
		model.chat.setCurrent(id);
		model.chat.getCurrent().unread = 0;
	};

	$scope.isActive = function(id) {
		if (id === model.chat.currentId) {
			return true;
		}
		else {
			return false;
		}
	};

	$scope.clickOnPlus = function() {
		main.createRoom();
	};

	$scope.getUnread = function(id) {
		var unread = model.chat.get(id).unread;
		if (unread) {
			return unread;
		}
		else {
			return "";
		}
	};

	$scope.close = function(id) {
		model.chat.close(id);
	};
});
