app.controller( 'chatHistoryController', function($scope, model, dialogs, chat) {

	$scope.chat = model.chat;
	$scope.file = model.file;
	$scope.conference = model.conference;

	$scope.$watch(function () {return model.chat.currentId;}, function() {
		$scope.history = model.chat.sortableArray;

	});

	$scope.clickEntry = function(id) {
		$scope.gotoState('chat');
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
		chat.createRoom();
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
		chat.closeChat(id);
	};
	
	$scope.clickConference = function(conference) {
		model.conference.current = conference;
		$scope.gotoState('conference');
		//model.
	};
	
	$scope.createConference = function() {
		
		var dlg = dialogs.create('app/dialogs/create.conference.html','conferenceDialogCtrl', {}, 'lg');
		
		dlg.result.then(function(name){
			model.conference.create(name);
		}, function(){
			if(angular.equals($scope.name,''))
				$scope.name = 'You did not enter in your name!';
		});
		
	};
	
});

/**
 * Controller for new conference dialog
 */
app.controller('conferenceDialogCtrl', function($scope,$modalInstance,data){
	//-- Variables --//

	$scope.conference = {name : ''};

	//-- Methods --//

	$scope.cancel = function(){
		$modalInstance.dismiss('Canceled');
	}; // end cancel

	$scope.save = function(){
		$modalInstance.close($scope.conference.name);
	}; // end save

	$scope.hitEnter = function(evt){
		if(angular.equals(evt.keyCode,13) && !(angular.equals($scope.conference.name,null) || angular.equals($scope.conference.name,'')))
			$scope.save();
	};
});
