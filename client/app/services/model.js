(function () {

	app.factory('model', function() {
		
		var model = {};

		model.file = {
		};
		model.video = {
		};

		model.auth = {
			constants: {
				orgUnit: "uwap:group:type:orgUnit"
			},
			token: "",
			orgUnitGroup: {}
		};

		model.userInfo = {
		};

		model.chat = {
			messages: [],
			addMessage: function(from, message) {
				this.messages.push({
					from: {
						jid: from,
						displayName: from.substring(from.indexOf("/") + 1)
					},
					message: message
				});
			}
		};

		model.friends = {
			list: {},
			create: function(id) {
				if (!this.list[id]) {
					this.list[id] = {
						id: id,
						displayName: id.substring(id.indexOf("/") + 1)
					};
				}
				else {
					console.error("id already taken");
				}
			}
		};

		model.progress = {
			value: 0
		};


		model.search = {
			query: "",
			searchId: 0,
			unsettable: false,
			currentRealm: "uninett.no",

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

		model.webrtc = {
		};



		return model;
	});

})();
