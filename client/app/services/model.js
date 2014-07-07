(function () {

	app.factory('model', function() {
		
		var model = {};

		model.file = {
		};
		model.video = {
		};

		model.auth = {
			token: "",
		};

		model.userInfo = {
		};

		model.chat = {
			messages: [{
				from: {
					displayName: "simen"
				},
				message: "hei"
			}],
			addMessage: function(from, message) {
				this.messages.push({
					from: {
						jid: from,
						displayName: from.substring(from.indexOf("/") + 1)
					},
					message: message
				});
			},
			history: [
				{name: "Simen"},
				{name: "Simen"},
				{name: "Simen"},
				{name: "Simen"}
			]
		};

		model.friends = {
			list: {},
			create: function(id) {
				if (!this.list[id]) {
					console.log("creating friend");
					this.list[id] = {
						id: id
					};
				}
				return this.list[id];
			}
		};

		model.groups = {
			list: {},
			create: function(id, displayName) {
				if (!this.list[id]) {
					this.list[id] = {
						id: id,
						displayName: displayName,
						addFriend: function(friend) {
							if (!this.friends[friend.id]) {
								this.friends[friend.id] = friend;
							}
						},
						removeFriend: function(friend) {
							delete this.friends[friend.id];
						},
						friends: {}
					};
				}
				return this.list[id];
			}
		};

		model.progress = {
			value: 40
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
