(function () {

	app.factory('model', function($state) {
		
		var model = {};

		model.file = {
			list: {},
			add: function(id, filename, user, sending) {

				if (this.list[id]) {
					return console.error("not unique file id");
				}
				this.list[id] = {
					filename: filename,
					user: user,
					sending: sending,
					progress: 0
				};

				if ($state.current.name !== "file") {
					this.unseen ++;
				}
			},
			remove: function(id, failed) {
				this.log.push({
					filename: this.list[id].filename,
					user: this.list[id].user,
					sent: this.list[id].sending,
					failed: failed
				});
				delete this.list[id];
			},
			unseen: 0,
			log: []
		};
		model.video = {
			local: "",
			remote: {
				src: "",
				userId: ""
			}
		};

		model.user = {
			info: null,
			token: null,
			realms: null
		};


		model.chat = {
			unread: 0,
			listOfIndices: {},
			sortableArray: [],
			currentId: "",
			getCurrent: function() {
				if (this.currentId) {
					return this.get(this.currentId);
				}
			},
			setCurrent: function(id) {
				this.currentId = id;
				if (id) {
					this.create(id);
				}
				console.log("current chat is now " + this.currentId);
			},
			create: function(id) {
				if (this.listOfIndices[id]) {
					return;
				}

				this.sortableArray.push({
					id: id,
					mostRecentTime: 0,
					messages: [],
					unread: 0,
					addMessage: function(from, message) {
						this.messages.push({
							from: from, 
							message: message
						});

						if ($state.current.name !== "chat") {
							if ($state.current.name === "video.active" && model.video.remote.userId === id) {

							}
							else {
								if (model.chat.currentId !== id) {
									this.unread ++;
								}

								model.chat.unread ++;
							}
						}
						else if (model.chat.currentId !== id) {
							this.unread ++;
						}
					},
				});
				this.sort();
			},
			get: function(id) {
				if (!id) {
					return;
				}
				this.create(id);
				return this.sortableArray[this.listOfIndices[id]];
			},
			sort: function() {
				this.sortableArray.sort(function(a,b) {return b.mostRecentTime - a.mostRecentTime;});
				for (var i in this.sortableArray) {
					this.listOfIndices[this.sortableArray[i].id] = i;
				}
				console.log(this.listOfIndices);
				console.log(this.sortableArray);
			}
		};

		model.friends = {
			list: {},
			create: function(id) {
				if (!this.list[id]) {
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
