(function () {

	app.factory('model', function(constants, $sce, utility) {
		
		var model = {};
		
		model.conference = {
			src: "",
			active: false,
			
			/**
			 * Current confernce object
			 */
			current: null,
			
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
		};

		model.file = {
			list: {},
			selectedFiles: [],
			add: function(id, filename, user, sending, size) {
				if (this.list[id]) {
					return console.error("not unique file id");
				}
				this.list[id] = {
					id: id,
					filename: filename,
					user: user,
					sending: sending,
					progress: 0,
					accepted: false,
					finished: false,
					cancel: null,
					accept: function() {
						this.accepted = true;
					},
					size: size,
				};

				model.chat.get(utility.getIdFromJid(user)).addFileMessage(id);
			},
			get: function(id) {
				return this.list[id];
			},
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
					participants: {},
					openConference: function() {
						if (!this.isRoom) {
							console.error("Is not conference");
						}
						this.conferenceOpen = true;
						model.conference.setActive(utility.getRoomIdFromJid(this.id));
					},
					closeConference: function() {
						if (!this.isRoom) {
							console.error("Is not conference");
						}
						this.conferenceOpen = false;
					},
					addParticipant: function(friend) {
						if (!this.isRoom) {
							console.error("Cannot add participant to a normal conversation");
						}
						if (this.participants[friend.id]) {
							return;
						}
						this.addSystemMessage(friend.name + " joined room");
						this.participants[friend.id] = friend;
					},
					removeParticipant: function(friend) {
						if (!this.isRoom) {
							console.error("Cannot remove participant from a normal conversation");
						}
						if (!this.participants[friend.id]) {
							return;
						}
						this.addSystemMessage(friend.name + " left room");
						delete this.participants[friend.id];
					},
				  	addSystemMessage: function(message) {
						var temp = {
							arrived: true,
							message: 'Info: ' + message,
							type: 'system',
							from: 'System',
							hidden: false
						};
						this.addObjectToList(temp);
					},
					addFileMessage: function(fileId) {
						var temp = {
							arrived: true,
							message: 'File',
							type: 'file',
							from: 'System',
							hidden: true,
							fileId: fileId
						};
						this.addObjectToList(temp);
					},
					ping: function() {
						var temp = {
							hidden: true,
							arrived: true,
							message: 'Ping',
							type: 'system',
							from: 'System'
						};
						this.addObjectToList(temp);
					},
					addMessage: function(from, message, sending) {
						var temp = {
							from: from, 
							message: message,
							type: 'chat',
							arrived: !sending,
							hidden: false
						};
						this.addObjectToList(temp);
						return temp;
					},
					addObjectToList: function(object) {
						var time = Date.now();
						this.mostRecentTime = time;
						object.time = time;
						if (model.chat.currentId !== id) {
							this.unread ++;
						}

						this.messages.push(object);

						model.chat.sort();
					},
				});
				this.sort();
			},
			get: function(id, doNotCreate) {
				if (!id) {
					return;
				}
				if (!doNotCreate) {
					this.create(id);
				}
				return this.sortableArray[this.listOfIndices[id]];
			},
			getWithGroupId: function(groupId) {
				if (!groupId) {
					return;
				}
				return this.get(utility.getRoomJidFromId(groupId), true);

			},
			roomCounter: 0,
			createRoom: function(id) {
				if (!id) {
					id = utility.getNicknameFromJid(model.user.info.userid);
					id += utility.randomString() + this.roomCounter++;
					id = utility.getRoomJidFromId(id);
				}
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
					this.sort();
				}
			}
		};


		model.friends = {
			list: {},
			bestFriends: [],
			create: function(id) {
				if (!this.list[id]) {
					this.list[id] = {
						id: id,
						isOnline: function() {
							return (this.mucOnline || this.online);
						},
						isMe: function() {
							if (model.user.info.xmpp && this.id === model.user.info.xmpp.jid) {
								return true;
							}
							return false;
						}
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
						return this.list[this.bestFriends[i]];
					}
				}
			},
			getWithNickname: function(nickname) {
				for (var i in this.list) {
					if (this.list[i].nickname === nickname) {
						return this.list[i];
					}
				}
			}
		};

		model.call = {
			list: {},
			status: "free",
			currentId: "",
			getCurrent: function() {
				return this.list[this.currentId];
			},
			add: function(id, calling, audio, video) {
				console.log("add call");
				if (this.list[id]) {
					console.log("already call with id");
					return;
				}
				this.list[id] = {
					id: id,
					video: video,
					audio: audio,
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
			currentRealm: null,
			setRealmSearch: function(realm) {
				console.log(realm);
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



		return model;
	});

})();
