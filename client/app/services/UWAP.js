(function () {

	app.factory('UWAP', function ( $location, $http, utility) {
		var UWAP = {};

		var api = {
			userInfo: "https://core.uwap.org/api/userinfo",
			groups: "https://core.uwap.org/api/groups",
			groupMembers: function(id) {
				return "https://core.uwap.org/api/group/" + id + "/members";
			},
			people: function(realm, query) {
				return "https://core.uwap.org/api/people/query/" + realm + "?query=" + query;
			},
			realms: "https://core.uwap.org/api/people/realms"
		};

		function sendRequest(token, url, callback) {
			if (!token) {
				console.log("token invalid");
				return;
			}
			$http({
				method: "get",
				url: url,
				headers: {
					'Authorization': 'Bearer ' + token
				}
			}).success(callback)
			.error(failedHTTP);
		
		}

		UWAP.getUserInfo = function(token, callback) {
			sendRequest(token, api.userInfo, callback);
		};
		UWAP.getPeople = function(token, callback, realm, query) {
			sendRequest(token, api.people(realm, query), callback);
		};
		
		UWAP.getGroups = function(token, callback) {
			sendRequest(token, api.groups, callback);
		};

		UWAP.getGroupMembers = function(token, groupId, callback) {
			sendRequest(token, api.groupMembers(groupId), callback);
		};

		UWAP.getRealms = function(token, callback) {
			sendRequest(token, api.realms, callback);
		};

		var failedHTTP = utility.handleHttpError;

		return UWAP;
	});
	

})();
