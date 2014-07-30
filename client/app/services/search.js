(function () {

	app.factory('search', function(UWAP, xmpp, $state, $rootScope, $timeout, userInfo) {
		var search = {
			init: function() {
				$rootScope.$watch(function() {return search.model.query;}, onChange);
				$rootScope.$watch(function() {return search.model.currentRealm;}, onChange);
			}
		};
		search.model = {
			query: "",
			searchId: 0,
			unsettable: false,
			currentRealm: null,
			setRealmSearch: function(realm) {
				if (realm) {
					this.currentRealm = realm;
					this.isRealmSearch = true;
					this.isLocalSearch = false;
				}
			},
			setLocalSearch: function() {
				this.currentRealm = null;
				this.isRealmSearch = false;
				this.isLocalSearch = true;
			},
			isLocalSearch: true,
			isRealmSearch: false,
			list: [],
			addPeopleToResults: function(people, searchId) {
				if (this.searchId !== searchId) {
					return;
				}
				if (this.unsettable) {return;}
				this.clearResults();

				for (var i in people) {
					this.addPersonToResults(people[i]);
				}
			},
			addPersonToResults: function(person) {
				if (this.unsettable) {return;}

				this.list.push({
					name: person.name,
					mail: person.mail,
					userid: person.userid,
					o: person.o,
					source: person.source,
					image: {
						preface: "data:image/jpeg;base64,",
						data: person.jpegphoto
					},
					getImage: function() {
						if (!this.image.data) {return "//:0";}
						return this.image.preface + this.image.data;
					},
					hasImage: function() {
						if (this.image.data) {return true;}
						else {return false;}
					}
				});
			},
			getId: function() {
				return ++this.searchId;
			},

			clearResults: function() {
				this.list.length = 0;
			}

		};

		var timeoutPromise;
		function onChange(newValue) {
			if (search.model.isRealmSearch) { 
				if (timeoutPromise) {
					$timeout.cancel(timeoutPromise);
				}
				timeoutPromise = $timeout(function() {
					search.model.unsettable = false;
					startSearch();
				}, 200);
			}
			else {
				search.model.unsettable = true;
				search.model.clearResults();
			}
		}
		
		function startSearch() {
			if (!search.model.query || !search.model.currentRealm) {return;}

			UWAP.getPeople(userInfo.user.token, (function(searchId) {
				return function (data) {
					if (data.people.length) {
						search.model.addPeopleToResults(data.people, searchId);
					}
				};
			})(search.model.getId()), search.model.currentRealm.realm , search.model.query);
		}

		return search;
	});

})();
