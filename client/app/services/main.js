(function () {

	app.factory('main', function(UWAP, xmpp, model, $state, $rootScope, $http, constants, webrtc, fileSender, fileReceiver, $timeout, utility, $sce) {
		var main = {
			init: function() {
				globalModel = model;
				$rootScope.gotoState("chat");
				gatherInfoPart1();
				fileSender.init();
				fileReceiver.init();
				$rootScope.$watch(function () {return model.video.active;}, function(newValue) {
					if (!newValue) {
						if ($state.current.name === "call") {
							$rootScope.gotoState("chat");
						}
					}
				});
				$rootScope.$watch(function () {return model.conference.active;}, function(newValue) {
					if (!newValue) {
						if ($state.current.name === "conference") {
							$rootScope.gotoState("chat");
						}
					}
				});

				var timeoutPromise;
				$rootScope.$watch(function() {return model.search.query;}, search);
				$rootScope.$watch(function() {return model.search.currentRealm;}, search);

				function search(newValue) {
					if (newValue) {
						if (timeoutPromise) {
							$timeout.cancel(timeoutPromise);
						}
						timeoutPromise = $timeout(function() {
							model.search.unsettable = false;
							main.search();
						}, 200);
					}
					else {
						model.search.unsettable = true;
						model.search.clearResults();
					}

				}

			}
		};

		$rootScope.gotoState = function(state) {
			$state.go(state);
		};

		$rootScope.getObjectLength = function(obj) {
			if (obj) {
				return Object.keys(obj).length;
			}
		};

		$rootScope.isMe = function(id) {
			if (utility.getIdFromJid(id) === model.user.info.xmpp.jid) {
				return true;
			}
			if (utility.getIdFromJid(id) === model.user.info.nickname) {
				return true;
			}
			return false;
		};
		

		function gatherInfoPart1 () { 
			$http.get('/api/info').success(function(data, status) {
				model.user.info = data;
				model.user.token = data.token;

				if (model.user.info.xmpp.registered) {
					xmpp.connect(model.user.info.xmpp.jid, model.user.info.xmpp.password, constants.xmpp.boshUrl, connectedCallback);
				}

			}).error(utility.handleHttpError);
		}

		main.videoCall = function(to) {
			if (model.call.status === "free") {
				model.call.status = "calling";
				model.call.currentId = to;
				model.call.add(to, true, true, true);
				sendCallSignal(to, {type: "offer", audio: true, video: true});
			}
		};

		main.audioCall = function(to) {
			if (model.call.status === "free") {
				model.call.status = "calling";
				model.call.currentId = to;
				model.call.add(to, true, true, false);
				sendCallSignal(to, {type: "offer", audio: true, video: false});
			}
		};

		function sendCallSignal (to, object) {
			xmpp.sendMessage(to, JSON.stringify(object), "call");
		}

		main.cancelCall = function(to) {
			if (model.call.status === "calling" && model.call.currentId === utility.getIdFromJid(to)) {
				model.call.status = "free";
				model.call.currentId = "";
				sendCallSignal(to, {type: "cancel"});

				model.call.remove(utility.getIdFromJid(to));
			}
		};

		main.acceptCall = function(to) {
			model.call.currentId = utility.getIdFromJid(to);
			model.call.status = "accept";
			model.call.getCurrent().hidden = true;
			sendCallSignal(to, {type: "accept"});
		};

		main.denyCall = function(to) {
			model.call.remove(utility.getIdFromJid(to));
			sendCallSignal(to, {type: "deny"});
			model.call.currentId = "";
			model.call.status = "free";
		};

		main.hangup = function() {
			if (model.call.status === "in-call" && model.call.currentId) {
				sendCallSignal(model.call.currentId, {type: "hangup"});
				model.chat.get(model.call.currentId).addSystemMessage("Call ended");
				webrtc.hangup();
			}
		};

		main.toggleVideo = function() {
			var video = !model.video.local.videoEnabled;
			model.video.local.videoEnabled = video;
			webrtc.enableVideo(video);
		};

		main.toggleAudio = function() {
			var audio = !model.video.local.audioEnabled;
			model.video.local.audioEnabled = audio;
			webrtc.enableAudio(audio);
		};

		function connectedCallback() {
			main.setVCard();
			webrtc.init();
			xmpp.addHandler(xmppHandlers.mucMessage, null, "message", "groupchat" );
			xmpp.addHandler(xmppHandlers.mucPresence, constants.xmpp.mucUser, "presence");
			xmpp.addHandler(xmppHandlers.basicHandler);
			xmpp.addHandler(xmppHandlers.message, null, "message", "chat");
			xmpp.addHandler(xmppHandlers.conferenceInvite, null, "message", "conferenceInvite");
			xmpp.addHandler(xmppHandlers.roomInvite, null, "message", "roomInvite");
			xmpp.addHandler(xmppHandlers.fileInvite, null, "message", "fileInvite");
			xmpp.addHandler(xmppHandlers.fileInviteResponse, null, "message", "fileInviteResponse");
			xmpp.addHandler(xmppHandlers.call, null, "message", "call");
			xmpp.addHandler(xmppHandlers.presence, constants.xmpp.client, "presence");
			xmpp.addHandler(xmppHandlers.roster, constants.xmpp.roster, "iq");

			gatherInfoPart2();

			model.conference.create();
		}

		main.sendMessage = function(to, message) {
			var jid = utility.getJidFromId(to);
			var messageObject = model.chat.get(to).addMessage(model.user.info.xmpp.jid, message, true);

			xmpp.sendMessage(jid, message, "chat", function() {
				$rootScope.$apply(function() {
					messageObject.arrived = true;
				});
			});
		};

		main.sendInviteToSearchPerson = function(person) {
			if (person.o.toLowerCase() === "uninett") {
				var temp = {
					name: person.name,
					mail: person.mail,
					o: person.o,
					source: person.source,
					userid: person.userid
				};
				$http.post('/api/inviteUninettPerson', JSON.stringify(temp)).success(function(data, status) {
					model.user.info = data;

				}).error(utility.handleHttpError);
			}
		};

		main.sendGroupMessage = function(to, message) {
			console.log(to);
			xmpp.sendGroupMessage(to, message);
		};

		main.addBestFriend = function(friend) {
			var jid = utility.getJidFromId(friend.id);
			if (!model.friends.isBestFriend(friend.id)) {
				xmpp.addToRoster(jid, callback);
			}
			else {
				console.log("already best friend");
			}
			function callback() {
				xmpp.sendPresenceType(jid, "subscribe");
			}
		};

		main.addBestFriendUWAP = function(person) {
			var temp = {
				name: person.name,
				mail: person.mail,
				o: person.o,
				source: person.source,
				userid: person.userid
			};
			$http.post('/api/addFriend', JSON.stringify(temp)).success(function(data, status) {
				model.user.info = data;

			}).error(utility.handleHttpError);
		};

		main.removeTempFriend = function(friend) {
			$http.post('/api/removeFriend', JSON.stringify(friend)).success(function(data, status) {
				model.user.info = data;
			}).error(utility.handleHttpError);
		};
		main.removeBestFriend = function(friend) {
			var jid = utility.getJidFromId(friend.id);
			if (model.friends.isBestFriend(friend.id)) {

				callback();
			}
			else {
				console.log("not best friend");
			}
			function callback() {
				xmpp.sendPresenceType(jid, "unsubscribe");
			}
		};

		main.createRoom = function() {
			var id = model.chat.createRoom();
			xmpp.joinRoom(utility.getRoomIdFromJid(id));
		};

		main.closeChat = function(id) {
			console.log("closing chat");
			if (model.chat.get(id).isRoom) {
				console.log("is room");
				xmpp.leaveRoom(id);
			}
			model.chat.close(id);
		};


		var xmppHandlers = {
			basicHandler: function(data) {
				//console.log(data);
			},
			call: function(data) {
				var body = data.getChildrenByTagName("body");
				if (body) {
					var callMessage = JSON.parse(body[0].children[0].data);
					var type = callMessage.type;
					console.log(type);
					var from = utility.getIdFromJid(data.from);
					if (type === "offer") {
						if (model.call.status === "free") {
							$rootScope.$apply(function() {
								model.chat.get(from).ping();
								model.call.add(from, false, callMessage.audio, callMessage.video);
							});
						}
						else {
							sendCallSignal(data.from, {type: "deny"});
						}
					}
					else if (type === "accept" && 
						model.call.status === "calling" &&
						model.call.currentId === from) {

						$rootScope.$apply(function() {
							model.call.getCurrent().hidden = true;
						});

						webrtc.call(data.from);
					}
					else if (type === "deny" && 
						model.call.status === "calling" &&
						model.call.currentId === from) {

						$rootScope.$apply(function() {
							model.chat.get(from).addSystemMessage("Call denied");
							model.call.deleteCurrent();
						});

						model.call.status = "free";
					}
					else if (type === "cancel" && model.call.status === "free") {
						$rootScope.$apply(function() {
							model.call.remove(from);
							model.chat.get(from).addSystemMessage("Call canceled");
						});
					}
					else if (type === "hangup" && model.call.status === "in-call") {
						$rootScope.$apply(function() {
							webrtc.hangup();
							model.chat.get(from).addSystemMessage("Call ended");
						});
					}
					else {
						console.error("received unwanted call signaling " + body);
					}


				} 
			},
			conferenceInvite: function(data) {
				var body = data.getChildrenByTagName("body");
				if (body) {
					var conference = JSON.parse(body[0].children[0].data);
					$rootScope.$apply(function() {
						model.conference.addInvitedTo(conference);
					});
				} 
			},
			fileInvite: function(data) {
				var body = data.getChildrenByTagName("body");
				if (body) {
					
					var request = JSON.parse(body[0].children[0].data);
					
					$rootScope.$apply(function() {
						model.chat.get(request.roomId).addFileInviteMessage(request);
					});
				} 
			},
			fileInviteResponse: function(data) {
				
				var body = data.getChildrenByTagName("body");
				
				if (body) {
					var response = JSON.parse(body[0].children[0].data); // response.roomId
					model.file.resolveRequest(response.id, response.isAccepted);
				} 
			},
			roomInvite: function(data) {
				var body = data.getChildrenByTagName("body");
				if (body) {
					var roomId = body[0].children[0].data;
					$rootScope.$apply(function() {
						model.chat.createRoom(roomId);
					});
					xmpp.joinRoom(utility.getRoomIdFromJid(roomId));
				} 
			},
			roster: function(data) {
				var query = data.getChildrenByTagName("query")[0];
				var items = query.getChildrenByTagName("item");

				var bestFriends = [];
				for (var i in items) {
					var id = utility.getIdFromJid(items[i].jid);
					if (!model.friends.get(items[i])) {
						addFriend(id);
					}
					switch (items[i].subscription) {
						case "to":
							case "both":
							$rootScope.$apply(add(id));
							break;
						case "remove":
							case "none":
							case "from":
							$rootScope.$apply(remove(id));
							break;
					}
				}
				function add(id) {
					return function() {
						model.friends.addBestFriend(id);
					};
				}
				function remove(id) {
					return function() {
						model.friends.removeBestFriend(id);
					};
				}
			},
			presence: function(data) {
				if (data.type === "subscribe") {
					xmpp.sendPresenceType(data.from, "subscribed");
				}
				else if (data.type === "subscribed") {
				}
				else if (data.type === "unsubscribe") {
					xmpp.sendPresenceType(data.from, "unsubscribed");
				}
				else if (data.type === "unsubscribed") {
				}
				else if (data.to) {
					if (data.from.indexOf("conference") !== -1) {
						return;
					}
					var from = utility.getIdFromJid(data.from);
					var friend = model.friends.get(from);
					if (!friend) {
						friend = addFriend(from);
					}
					$rootScope.$apply(function() {
						if (data.type === "unavailable") {
							friend.online = false;
						}
						else {
							friend.online = true;
						}
					});
				}
			},
			message: function(data) {
				var message = data.getChildrenByTagName("body")[0].children[0].data;
				var id = utility.getIdFromJid(data.from);

				$rootScope.$apply(function() {
					model.chat.get(id).addMessage(id, message);
				});
			},
			mucMessage: function(data) {
				var body = data.getChildrenByTagName("body")[0];
				if (body) {
					var message = body.children[0].data;
					var id = utility.getIdFromJid(data.from);
					var from = utility.getNicknameFromRoomJid(data.from);

					$rootScope.$apply(function() {
						model.chat.get(id).addMessage(from, message);
					});
				}
			},
			mucPresence: function(data) {
				var from = data.from;
				var groupId = utility.getRoomIdFromJid(from);

				var x = data.getChildrenByTagName("x");
				if (x.length && x[0].xmlns === constants.xmpp.mucUser) {
					var item = x[0].getChildrenByTagName("item");

					var statuses = x[0].getChildrenByTagName("status");
					var codes = {};
					for (var i = 0; i < statuses.length; i++) {
						if (statuses[i]) {
							var code = statuses[i].code;
							if (code) {
								codes[code] = true;
							}
						}
					}

					if (item.length) {

						var jid = item[0].jid;
						if (jid) {
							$rootScope.$apply(function() {
								var userName, friend;
								if (model.groups.list[groupId] && data.to) {
									userName = utility.getIdFromJid(jid);
									friend = model.friends.get(userName);
									if (!friend) {
										friend = addFriend(userName);
									}
									model.groups.list[groupId].addFriend(friend);
									if (data.type === "unavailable") {
										friend.mucOnline = false;
									}
									else {
										friend.mucOnline = true;
									}
								}
								else if (model.chat.getWithGroupId(groupId)){
									userName = utility.getIdFromJid(jid);
									friend = model.friends.get(userName);
									if (!friend) {
										friend = addFriend(userName);
									}
									if (!codes["110"]) {
										if (data.type === "unavailable") {
											friend.mucOnline = false;
											model.chat.getWithGroupId(groupId).removeParticipant(friend);
										}
										else {
											friend.mucOnline = true;
											model.chat.getWithGroupId(groupId).addParticipant(friend);
										}
									}
								}
							});
						}

						if (item[0].role === "moderator") {
							if (codes["110"] && !codes["100"]) {
								xmpp.sendRoomConfig(utility.getBareJid(from));
							}
						}

					}
				}
			}
		};


		function gatherInfoPart2 () {
			UWAP.getGroups(model.user.token, function (data) {
				var groups = data.Resources;
				for (var i in groups) {
					var group = groups[i];
					if (group.groupType === constants.uwap.orgUnit || group.groupType === constants.uwap.adHoc) {
						var groupId = encodeURIComponent(group.id).toLowerCase();
						model.groups.create(groupId, group.displayName);
						xmpp.joinRoom(groupId);
					}
				}
			}); 
			UWAP.getRealms(model.user.token, function (data) {
				model.user.realms = data;
			}); 
			xmpp.getRoster();
		}

		main.setVCard = function () {
			var properties = {};
			properties.name = model.user.info.name;
			properties.userid = model.user.info.userid;
			properties.nickname = model.user.info.nickname;
			xmpp.setVCard(properties);
		};

		main.getVCard = function (jid) {
			xmpp.getVCard(jid, function(stanza) {
				var userId = utility.getIdFromJid(jid);
				if (stanza.getElementsByTagName("name").length) {
					$rootScope.$apply(function () {
						model.friends.get(userId).name = stanza.getElementsByTagName("name")[0].innerHTML;
					});
				}
				if (stanza.getElementsByTagName("userid").length) {
					$rootScope.$apply(function () {
						model.friends.get(userId).userid = stanza.getElementsByTagName("userid")[0].innerHTML;
					});
				}
				if (stanza.getElementsByTagName("nickname").length) {
					$rootScope.$apply(function () {
						model.friends.get(userId).nickname = stanza.getElementsByTagName("nickname")[0].innerHTML;
					});
				}
			});
		};

		function addFriend(id) {
			var friend;
			if (!model.friends.get(id)) {
				friend = model.friends.create(id);
				main.getVCard(utility.getJidFromId(id));
			}
			else {
				friend = model.friends.get(id);
			}
			return friend;
		}

		/**
		 * 
		 * @param {type} participants
		 * @param {type} roomId
		 */
		main.sendFileInvite = function(friend_id, room_id, file) {
			
			var request = model.file.createRequest(friend_id, room_id, file);
			
			var request_data = {
				name: file.name,
				size: file.size,
				id: request.id,
				roomId: room_id,
				from: model.user.info.xmpp.jid
			};
			
			xmpp.sendMessage(friend_id, JSON.stringify(request_data), "fileInvite", function() {
				$rootScope.$apply(function() {});
			});
			
			return request.task.promise;
		};
		
		main.respondFileInvite = function(from_id, room_id, request_id, is_accepted) {
						
			var response_data = {
				roomId: room_id,
				id: request_id,
				isAccepted: is_accepted
			};
			
			xmpp.sendMessage(from_id, JSON.stringify(response_data), "fileInviteResponse", function() {
				$rootScope.$apply(function() {});
			});
			
		};

		main.sendRoomInvite = function(friend, roomId) {
			xmpp.sendMessage(friend.id, roomId, "roomInvite", function() {
				$rootScope.$apply(function() {

				});
			});
		};

		main.sendInvite = function(friend, conference) {
			if (conference.isInvited(friend)) {
				return console.log("already invited");
			}
			var temp = {
				id: conference.id,
				name: conference.name,
				owner: conference.owner,
				invitedBy: model.user.info.xmpp.jid
			};
			xmpp.sendMessage(friend.id, JSON.stringify(temp), "conferenceInvite", function() {
				$rootScope.$apply(function() {
					conference.addInvite(friend);
				});
			});
		};


		main.search = function() {
			if (!model.search.query || !model.search.currentRealm) {return;}

			UWAP.getPeople(model.user.token, (function(searchId) {
				return function (data) {
					if (data.people.length) {
						model.search.addPeopleToResults(data.people, searchId);
					}
				};
			})(model.search.getId()), model.search.currentRealm.realm , model.search.query);
		};

		main.sendFiles = function(to, files) {
			var jid = utility.getJidFromId(to);
			if (!files) {
				files = model.file.selectedFiles;
			}
			else {
				if (!files.length) {return console.error("no files!!");}
				for (var i = 0; i < files.length; i++) {
					fileSender.sendFile(files[i], jid);
				}
			}
		};

		main.logOff = function() {
			xmpp.logOff();
		};


		return main;
	});

})();
