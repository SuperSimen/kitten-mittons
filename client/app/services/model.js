(function () {

	app.factory('model', function($state, constants, $sce, utility) {
		
		var model = {};
		
		model.conference = {
			list: {},
			idCounter: 0,
			unseen: 0,

			src: "",
			active: false,
			setActive: function(id) {
				if (this.src) {
					return console.log("Call already active");
				}
				this.src = $sce.trustAsResourceUrl(constants.conferenceUrl + "/" + id);
				this.active = true;
			},
			closeActive: function() {
				this.src = "";
				this.active = false;
			},

			addInvitedTo: function(conference) {
				var id = conference.id;
				if (this.list[id]) {
					return console.error("id not unique");
				}

				this.list[id] = this.createNew(conference.name, id, conference.owner, conference.invitedBy);

				if ($state.current.name !== "conference") {
					this.unseen ++;
				}
			},
			createNew: function(name, id, owner, invitedBy) {
				return {
					name: name,
					id: id,
					invites: [],
					owner: owner,
					invitedBy: invitedBy,
					open: function() {
						model.conference.setActive(this.id);
					},
					isInvited: function(friend) {
						if (friend) {
							for (var i in this.invites) {
								if (this.invites[i] === friend) {
									return true;
								}
							}
						}
						return false;

					}
				};
			},
			create: function(name) {
				var id = Math.random().toString(32).substring(2) + name.toLowerCase().replace(/[^a-z]+/g, '') + this.idCounter++;
				if (this.list[id]) {
					return console.error("id not unique");
				}

				this.list[id] = this.createNew(name, id, model.user.info.xmpp.jid);
				return id;
			},
			invitingid: "",
			getCurrent: function() {
				return this.list[this.invitingid]; 
			},
			addInvite: function(friend) {
				var conference = this.list[this.invitingid];
				if (this.invitingid && conference) {
					for (var i in conference.invites) {
						if (conference.invites[i] === friend) {
							return console.log("already invited");
						}
					}
					conference.invites.push(friend);
				}
			},
			removeInvite: function(friend) {
				var conference = this.list[this.invitingid];
				if (invitingid && conference) {
					for (var i in conference.invites) {
						if (conference.invites[i] === friend) {
							conference.invites.splice(i,1);
							return;
						}
					}
				}
				console.log("could not find invite");
			}
		};

		model.file = {
			list: {},
			selectedFiles: [],
			add: function(id, filename, user, sending, size) {

				if (this.list[id]) {
					return console.error("not unique file id");
				}
				this.list[id] = {
					filename: filename,
					user: user,
					sending: sending,
					progress: 0,
					size: size
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
					size: this.list[id].size,
					failed: failed
				});
				delete this.list[id];
			},
			unseen: 0,
			log: []
		};
		model.video = {
			active: null,
			busy: null,
			local: {
				videoEnabled: true,
				audioEnabled: true,
				src: ""
			},
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
			},
			create: function(id, isRoom) {
				if (this.listOfIndices[id]) {
					return;
				}

				this.sortableArray.push({
					id: id,
					mostRecentTime: 0,
					messages: [],
					unread: 0,
					isRoom: isRoom,
					addMessage: function(from, message, sending) {
						this.mostRecentTime = Date.now();
						var temp = {
							from: from, 
							message: message,
							type: 'chat',
							arrived: !sending
						};

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

						this.messages.push(temp);

						model.chat.sort();
						return temp; 
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
			roomCounter: 0,
			createRoom: function() {
				var id = utility.getGroupIdFromJid(model.user.info.userid);
				id += Math.random().toString(32).substring(2) + this.roomCounter++;
				this.create(id, true);
				return id;
			},
			sort: function() {
				this.sortableArray.sort(function(a,b) {return b.mostRecentTime - a.mostRecentTime;});
				for (var i in this.sortableArray) {
					this.listOfIndices[this.sortableArray[i].id] = i;
				}
			},
			close: function(id) {
				if (id) {
					this.sortableArray.splice(this.listOfIndices[id], 1);
					delete this.listOfIndices[id];
					if (id === this.currentId) {
						this.setCurrent("");
					}
				}
			}
		};


		model.friends = {
			list: {},
			bestFriends: [],
			create: function(id) {
				if (!this.list[id]) {
					this.list[id] = {
						id: id
					};
				}
				return this.list[id];
			},
			removeBestFriend: function(id) {
				for (var i in this.bestFriends) {
					if (this.bestFriends[i] === id) {
						this.bestFriends.splice(i,1);
						return;
					}
				}
			},
			addBestFriend: function(id) {
				for (var i in this.bestFriends) {
					if (this.bestFriends[i] === id) {
						return;
					}
				}
				this.bestFriends.push(id); 
			},
			isBestFriend: function(id) {
				for (var i in this.bestFriends) {
					if (this.bestFriends[i] === id) {
						return true;
					}
				}
				return false;
			},
			get: function(id) {
				return this.list[id];
			},
			getWithUserid: function(userid) {
				for (var i = 0; i < this.bestFriends.length; i++) {
					if (this.list[this.bestFriends[i]].userid === userid) {
						return true;
					}
				}
				return false;
			}
		};

		model.call = {
			list: {},
			status: "free",
			currentId: "",
			getCurrent: function() {
				console.log("Get current");
				console.log(this.list);
				console.log(this.currentId);
				return this.list[this.currentId];
			},
			add: function(id, calling) {
				console.log("add call");
				if (this.list[id]) {
					console.log("already call with id");
					return;
				}
				this.list[id] = {
					id: id,
					video: true,
					audio: true,
					hidden: false,
					calling: calling
				};
			},
			deleteCurrent: function() {
				if (this.list[this.currentId]) {
					delete this.list[this.currentId];
					this.currentId = "";
				}
			},
			remove: function(id) {
				console.log("deleting id");
				console.log(id);
				console.log(this.list);
				if (this.list[id]) {
					delete this.list[id];
				}
				console.log("finished id");

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



		return model;
	});

})();
