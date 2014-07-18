app.controller( 'conferenceController', function($scope, model, $window, constants) {
	$scope.conference = model.conference;
	$scope.create = function() {
		if ($scope.conferenceName) {
			model.conference.create($scope.conferenceName);
		}
	};

	$scope.gotoConference = function(id) {
		if (id) {
			var url = constants.conferenceUrl + "/" + id;
			$window.open(url);
		}
	};

	$scope.isInviting = function(id) {
		if (id && model.conference.invitingid && id === model.conference.invitingid) {
			return true;
		}
		else {
			return false;
		}
	};

	$scope.toggleInvite = function(id) {
		if (id) {
			if (model.conference.invitingid === id) {
				model.conference.invitingid = null;
			}
			else {
				model.conference.invitingid = id;
			}
		}
	};
});