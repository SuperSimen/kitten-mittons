app.controller( 'chatHistoryController', function($scope, dialogs, chat, callModel, call) {

	$scope.chat = chat.model;
	$scope.conference = chat.model.conference;

	$scope.isChatInCall = function(chatId) {
		
		if(callModel.isIdActive(chatId)) {
			return true;
		}
		
		var chat_instance = chat.model.get(chatId);
		var active = chat.model.get(chatId);
		
		if(active && active.conferenceOpen && chat.model.conference.mediaActive) {
			return true;
		}
		
		return false;
	};
	
	$scope.isChatVideoActive = function(chatId) {
		
		var active = chat.model.get(chatId);
		
		if(active) {
			if(active.isRoom) {
				return true;
			} else {
				var call_current = callModel.getCurrent();
				return call_current && call_current.video;
			}
		}
		
	};

	$scope.$watch(function () {return chat.model.currentId;}, function() {
		$scope.history = chat.model.sortableArray;

	});

	$scope.clickEntry = function(id) {
		$scope.gotoState('chat');
		chat.model.setCurrent(id);
		chat.model.getCurrent().unread = 0;
	};

	$scope.isActive = function(id) {
		if (id === chat.model.currentId) {
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
		var unread = chat.model.get(id).unread;
		if (unread) {
			return unread;
		}
		else {
			return "";
		}
	};

	$scope.close = function(id) {
		if (callModel.currentId === id) {
			call.cleanUp();
		}
		chat.closeChat(id);
	};
	
	$scope.clickConference = function(conference) {
		chat.model.conference.current = conference;
		$scope.gotoState('conference');
		//model.
	};
	
	$scope.createConference = function() {
		
		var dlg = dialogs.create('app/dialogs/create.conference.html','conferenceDialogCtrl', {}, 'lg');
		
		dlg.result.then(function(name){
			chat.model.conference.create(name);
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
