(function () {

	app.factory('chat', function(xmpp,  $rootScope, constants, utility, userInfo, $sce) {
		var chat = {
			init: function() {
				xmpp.addHandler(xmppHandlers.mucMessage, null, "message", "groupchat" );
				xmpp.addHandler(xmppHandlers.message, null, "message", "chat");
				xmpp.addHandler(xmppHandlers.roomInvite, null, "message", "roomInvite");
				xmpp.addHandler(xmppHandlers.systemNotification, null, "message", "systemNotification");
			}
		};

		chat.model = {
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
						chat.model.conference.mediaOpen = true;
						chat.model.conference.setActive(utility.getRoomIdFromJid(this.id));
					},
					closeConference: function() {
						if (!this.isRoom) {
							console.error("Is not conference");
						}
						this.conferenceOpen = false;
						chat.model.conference.mediaOpen = false;
					},
					addParticipant: function(friend) {
						if (!this.isRoom) {
							console.error("Cannot add participant to a normal conversation");
						}
						if (this.participants[friend.id]) {
							return;
						}
						if (!friend.name) {
							console.log("adding unknown participant:");
							console.log(friend);
						}
						var dynamicMessage = {
							from: friend,
							getMessage: function() {
								if (this.from.name) {
									return this.from.name + " joined room";
								}
								return "";
							}
						};
						this.addSystemMessage(null, dynamicMessage);
						this.participants[friend.id] = friend;
					},
					removeParticipant: function(friend) {
						if (!this.isRoom) {
							console.error("Cannot remove participant from a normal conversation");
						}
						if (!this.participants[friend.id]) {
							return;
						}
						var dynamicMessage = {
							from: friend,
							getMessage: function() {
								if (this.from.name) {
									return this.from.name + " left room";
								}
								return "";
							}
						};
						this.addSystemMessage(null, dynamicMessage);
						delete this.participants[friend.id];
					},
					addSystemMessage: function(message, dynamicMessage) {
						var temp = {
							arrived: true,
							dynamicMessage: dynamicMessage,
							getMessage: function() {
								if (this.dynamicMessage) {
									return "Info: " + dynamicMessage.getMessage();
								}
								else {
									return this.message;
								}
							},
							message: 'Info: ' + message,
							type: 'system',
							from: 'System',
							hidden: false
						};
						this.addObjectToList(temp);
						this.makeSoundGoPing();
					},
					addFileInviteMessage: function(request) {
						this.addObjectToList({
							arrived: true,
							message: request.name + " (" + request.size + " bytes)",
							type: 'file_invite',
							from: request.from,
							hidden: true,
							requestId: request.id,
							responded: false
						});
						this.makeSoundGoPing();
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
						this.makeSoundGoPing();
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
						this.makeSoundGoPing();
						return temp;
					},
					makeSoundGoPing: function() {
						if (this.id !== chat.model.currentId) {
							$rootScope.messageAudioNotify();
						}
					},
					addObjectToList: function(object) {
						
						var time = Date.now();
						this.mostRecentTime = time;
						object.time = time;
						if (chat.model.currentId !== id) {
							this.unread ++;
						}

						this.messages.push(object);

						chat.model.sort();

						$rootScope.application.ping();
					},
					getGroupRoomName: function() {
						
						var arr = (function(obj) {
							var arr = [];
							for(var i in obj) {
								arr.push(obj[i]);
							}
							return arr;
						})(this.participants);

						var names = arr.filter(function(friend) {
							return !friend.isMe() && friend.isOnline();
						}).map(function(friend) {
							return friend.name;
						});

						if(names.length > 0) {
							return "Group room" + " with " + names.join(", ");			
						}
						
						return "Group room";
						
					}
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
					id = utility.getNicknameFromJid(userInfo.user.info.userid);
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

		chat.model.conference = {
			
			/**
			 * Set to true if meetme conference is open for some conference
			 */
			mediaOpen: false,
			
			/**
			 * Set to true if meetme conference media is active
			 */
			mediaActive: false,
			
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
				callModel.status = "in-conference";
			},
			closeActive: function() {
				chat.model.conference.mediaActive = false;
				chat.model.getCurrent().conferenceOpen = false;
				this.src = "";
				this.active = false;
				callModel.status = "free";
			},
		};

		chat.sendMessage = function(to, message) {
			var jid = utility.getJidFromId(to);
			var messageObject = chat.model.get(to).addMessage(userInfo.user.info.xmpp.jid, message, true);

			xmpp.sendMessage(jid, message, "chat", function() {
				$rootScope.$apply(function() {
					messageObject.arrived = true;
				});
			});
		};

		chat.sendGroupMessage = function(to, message) {
			xmpp.sendGroupMessage(to, message);
		};

		chat.createRoom = function() {
			var id = chat.model.createRoom();
			xmpp.joinRoom(utility.getRoomIdFromJid(id));
		};

		chat.closeChat = function(id) {
			if (chat.model.get(id).isRoom) {
				if(chat.model.get(id).conferenceOpen) {
					chat.model.conference.closeActive();
				}
				xmpp.leaveRoom(id);
			}

			chat.model.close(id);
		};

		var xmppHandlers = {
			systemNotification: function(data) {
				var body = data.getChildrenByTagName("body");
				if (body) {
					var req = JSON.parse(body[0].children[0].data);
					$rootScope.$apply(function() {
						chat.model.get(req.chatId).addSystemMessage(req.message);
					});
				} 
			},
			roomInvite: function(data) {
				var body = data.getChildrenByTagName("body");
				if (body) {
					var roomId = body[0].children[0].data;
					$rootScope.$apply(function() {
						chat.model.createRoom(roomId);
					});
					xmpp.joinRoom(utility.getRoomIdFromJid(roomId));
				} 
			},
			message: function(data) {
				var message = data.getChildrenByTagName("body")[0].children[0].data;
				var id = utility.getIdFromJid(data.from);

				$rootScope.$apply(function() {
					chat.model.get(id).addMessage(id, message);
				});
			},
			mucMessage: function(data) {
				var body = data.getChildrenByTagName("body")[0];
				if (body) {
					var message = body.children[0].data;
					var id = utility.getIdFromJid(data.from);
					var from = utility.getNicknameFromRoomJid(data.from);

					$rootScope.$apply(function() {
						chat.model.get(id).addMessage(from, message);
					});
				}
			},
		};

		chat.sendRoomInvite = function(friend, roomId) {
			xmpp.sendMessage(friend.id, roomId, "roomInvite");
		};

		chat.sendSystemNotification = function(to_id, group_id, message) {
			var data = {
				chatId: group_id,
				message: message
			};
			
			xmpp.sendMessage(to_id, JSON.stringify(data), "systemNotification", function() {
				$rootScope.$apply();
			});
		};

		return chat;
	});

})();
