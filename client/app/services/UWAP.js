(function () {

	app.factory('UWAP', function ( $location, $http, utility) {
		var factory = {};
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

		factory.getUserInfo = function(token, callback) {
			sendRequest(token, api.userInfo, callback);
		};
		factory.getPeople = function(token, callback, realm, query) {
			sendRequest(token, api.people(realm, query), callback);
		};
		
		factory.getGroups = function(token, callback) {
			sendRequest(token, api.groups, callback);
		};

		factory.getGroupMembers = function(token, groupId, callback) {
			sendRequest(token, api.groupMembers(groupId), callback);
		};

		factory.getRealms = function(token, callback) {
			sendRequest(token, api.realms, callback);
		};

		var failedHTTP = utility.handleHttpError;

		return factory;
	});
	

})();
