(function () {

	app.factory('userInfo', function() {
		
		var userInfo = {};

		userInfo.user = {
			info: null,
			token: null,
			realms: null
		};

		return userInfo;
	});

})();
