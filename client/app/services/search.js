(function () {

	app.factory('search', function(UWAP, xmpp, model, $state, $rootScope, $timeout) {
		var search = {
			init: function() {
				$rootScope.$watch(function() {return model.search.query;}, onChange);
				$rootScope.$watch(function() {return model.search.currentRealm;}, onChange);
			}
		};

		var timeoutPromise;
		function onChange(newValue) {
			if (model.search.isRealmSearch) { 
				if (timeoutPromise) {
					$timeout.cancel(timeoutPromise);
				}
				timeoutPromise = $timeout(function() {
					model.search.unsettable = false;
					startSearch();
				}, 200);
			}
			else {
				model.search.unsettable = true;
				model.search.clearResults();
			}
		}
		
		function startSearch() {
			if (!model.search.query || !model.search.currentRealm) {return;}

			UWAP.getPeople(model.user.token, (function(searchId) {
				return function (data) {
					if (data.people.length) {
						model.search.addPeopleToResults(data.people, searchId);
					}
				};
			})(model.search.getId()), model.search.currentRealm.realm , model.search.query);
		}

		return search;
	});

})();
