app.controller( 'conferenceController', function($scope, model, $window, constants) {
	$scope.conference = model.conference;
	$scope.friends = model.friends;

	$scope.create = function() {
		if ($scope.conferenceName) {
			model.conference.create($scope.conferenceName);
		}
	};

	$scope.gotoConference = function(conference) {
		if (conference) {
			conference.open();
		}
	};

	$scope.isAdministrator = function() {
		return $scope.conference.current.invitedBy != false;
	};

	$scope.isInvited = function(friend) {
		var ret = $scope.conference.current.isInvited(friend);
		return ret;
	};

	$scope.toggleInvite = function(friend) {
		console.log('toggleInvite');
		return !$scope.isInvited(friend) 
			? $scope.conference.current.addInvite(friend)
			: $scope.conference.current.removeInvite(friend);
	};
	
});
/*
app.filter('friendonline', function() {
  return function(arr, start, end) {
    return (arr || []).slice(start, end);
  };
})*/