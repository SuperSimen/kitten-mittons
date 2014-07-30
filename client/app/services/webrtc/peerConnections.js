(function () {

	app.factory('peerConnections', function($rootScope, constants,  xmpp, utility, $sce, call) {
		var peerConnections = {};

		var connections = {
			list: {},
			counter: 0,
			add: function(peerConnection, to, id, onDataChannel) {
				if (!id) {
					id = this.generateRandomId();
				}

				if (this.list[id]) {
					console.error("random id is not random");
					return;
				}

				var iceCandidates = this.createIceCandidates(to, id);

				this.list[id] = {
					peerConnection: peerConnection,
					iceCandidates: iceCandidates
				};

				peerConnection.onicecandidate = function(event) {
					if (event.candidate) {
						iceCandidates.addIceCandidate(event.candidate);
					}
				};
				peerConnection.onaddstream = onAddStream;

				function answerHandlerCallback () {
					iceCandidates.setReadyToSend(true);
				}

				if (onDataChannel) {
					peerConnection.ondatachannel = onDataChannel; 
				}

				xmpp.addHandler(this.createAnswerHandler(peerConnection, answerHandlerCallback), constants.xmpp.webrtc, "message", "answer", id);
				xmpp.addHandler(this.createIceHandler(peerConnection), constants.xmpp.webrtc, "message", "iceCandidate", id);

				return id;
			},

			createIceCandidates: function(to, id) {
				return {
					list: [],
					readyToSend: false,
					setReadyToSend: function(ready) {
						this.readyToSend = ready;
						if (ready && this.list.length) {
							this.sendAndEmptyIceCandidates();
						}
					},
					addIceCandidate: function (candidate) {
						this.list.push(candidate);
						if (this.readyToSend) {
							this.sendAndEmptyIceCandidates();
						}
					},
					sendAndEmptyIceCandidates: function() {
						if (!to) {
							console.error("SENDING TO WHOM=!? WHAT??!!");
							return;
						}
						for (var i in this.list) {
							var iceCandidate = $msg({to: to, type: "iceCandidate", id: id})
							.c("x", {xmlns: constants.xmpp.webrtc}).up()
							.c("desc").t(JSON.stringify(this.list[i]));
							xmpp.send(iceCandidate);
						}
						this.list.length = 0;
					}

				};

			},
			get: function(id) {
				return this.list[id].peerConnection;
			},
			getIceCandidates: function(id) {
				return this.list[id].iceCandidates;
			},
			generateRandomId: function() {
				var me = model.user.info.xmpp.jid;
				var userid = utility.getIdFromJid(me);
				var randomId = userid + " - " + utility.randomString() + "-" + this.counter++;
				return randomId;
			},
			createAnswerHandler: function (peerConnection, callback) {
				return function(data) {
					var desc = JSON.parse(data.getChildrenByTagName("desc")[0].children[0].data);

					var from = data.from;
					peerConnection.setRemoteDescription(
						new RTCSessionDescription(desc), 
						function() {},
						function(err) {
							console.log(err);
						}
					);
					callback();
				};
			},
			createIceHandler: function (peerConnection) {
				return function (data) {
					if (!peerConnection) {
						console.error("received unwanted iceCandidate");
						return;
					}
					var candidate = data.getChildrenByTagName("desc")[0].children[0].data;
					var ice = new RTCIceCandidate(JSON.parse(candidate));
					peerConnection.addIceCandidate(ice, function() {
					},
					function(err) {
						console.log(err);
					});
				};
			}
		};

		var config = {
			iceServers: constants.iceServers
		};

		peerConnections.create = function() {
			return new webkitRTCPeerConnection(config);
		};

		peerConnections.add = function(peerConnection, to, id, onDataChannel) {
			return connections.add(peerConnection, to, id, onDataChannel);
		};

		peerConnections.getIceCandidates = function(id) {
			return connections.getIceCandidates(id);
		};

		function createDesc(callback){
			return function(desc) {
				callback(desc);
			};
		}

		function onAddStream (e){
			$rootScope.$apply(function() {
				console.log(e);
				call.model.video.active = true;
				call.model.status = "in-call";
				call.model.video.remote.src = $sce.trustAsResourceUrl(URL.createObjectURL(e.stream));
				call.model.video.remote.stream = e.stream;
			});
		}

		return peerConnections;

	});
})();
