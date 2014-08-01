(function () {

	app.factory('dataSender', function(constants, xmpp, $timeout, utility, peerConnections) {
		var dataSender = {};

		var dataSenders = {
			list: {},
			counter: 0,
			getSender: function(to, getActualSender, type, statusCallback) {
				if (!this.list[to]) {
					this.list[to] = this.createSenderObject(to);
				}

				if (getActualSender) {
					return this.list[to];
				}
				else {
					var id = utility.randomString() + this.counter++;
					this.list[to].addInstance(id, function() {
						if (statusCallback) {
							statusCallback("failed");
						}
					});
					return {
						send: function(object, priority) {
							dataSenders.list[to].sendObject(object, type, statusCallback, priority);
						},
						finished: function() {
							dataSenders.list[to].removeInstance(id);
							if (dataSenders.list[to].instances.length === 0) {
								dataSenders.list[to].clean(function() {
									if (dataSenders.list[to]) {
										//delete dataSenders.list[to];
									}
								});
							}
						}
					};
				}
			},
			createSenderObject: function(to) {
				return {	
					dataChannels: [],
					currentChannel: 0,
					queue: [],
					instances: [],
					sendingData: false,
					listOfPeerConnections: [],
					failedTimeout: null,
					failed: false,
					addPeerConnection: function(peerConnection) {
						this.listOfPeerConnections.push(peerConnection);
					},
					readyToCreatePeerConnection: true,
					newPeerConnection: function(callback) {
						if (!this.readyToCreatePeerConnection) {
							$timeout(callback, 100);
							return;
						}

						dataSenders.list[to].readyToCreatePeerConnection = false;
						this.timeoutPromise = $timeout(function() {
							if (dataSenders.list[to]) {
								dataSenders.list[to].readyToCreatePeerConnection = true;
							}
						}, 10000);

						var peerConnection = peerConnections.create();
						var id = peerConnections.add(peerConnection, to);

						var dataChannel = peerConnection.createDataChannel("channel", {
							ordered: false
						}); 


						this.addPeerConnection(peerConnection);
						this.addDataChannel(dataChannel);

						peerConnection.createOffer(createDesc(function(desc) {
							peerConnection.setLocalDescription(desc);
							var offer = $msg({to: to, type: "offer", id: id})
							.c("x", {xmlns: constants.xmpp.webrtc, type: "data"}).up()
							.c("desc").t(JSON.stringify(desc));
							xmpp.send(offer);
						}));


						if (callback) {
							$timeout(callback, 100);
						}
					},
					clean: function(callback) {

						while (this.listOfPeerConnections.length) {
							this.listOfPeerConnections[0].close();
							this.listOfPeerConnections.shift();
						}

						this.currentChannel = 0;

						if (callback) callback();
					},
					removeInstance: function(id) {
						for (var i in this.instances) {
							if (this.instances[i].id === id) {
								this.instances.splice(i,1);
								return;
							}
						}
						console.log("could not find and delete fileId");
					},
					addInstance: function(id, failedCallback) {
						this.instances.push({
							id: id,
							failedCallback: failedCallback
						});
					},
					addDataChannel: function(dataChannel) {

						dataChannel.onerror = function (error) {
							console.log("Data Channel Error:", error);
						};
						dataChannel.onmessage = messageHandlers.mainHandler(to);
						dataChannel.onopen = function () {
							dataSenders.list[to].dataChannels.push(dataChannel);
						};
						dataChannel.onclose = function () {
							if (dataSenders.list[to]) {
								dataSenders.list[to].removeDataChannel(dataChannel);
							}
						};

					},
					removeDataChannel: function(dataChannel) {
						for (var i in this.dataChannels) {
							if (this.dataChannels[i] === dataChannel) {
								this.dataChannels.splice(i,1);
								return;
							}
						}
						console.log("could not find datachannel");
					},
					incrementCurrentChannel: function() {
						if (++this.currentChannel >= this.dataChannels.length) {
							this.currentChannel = 0;
						}
					},
					sendOnAvailableChannel: function(object) {
						var counter = 0;
						while (counter++ < this.dataChannels.length) {
							try {
								var message = JSON.stringify(object.msg);
								this.dataChannels[this.currentChannel].send(message);
								if (object.callback) {
									object.callback("sent");
								}
								return true;
							}
							catch (err) {
							}
							this.incrementCurrentChannel();
						}
						return false;
					},
					sendObject: function(object, type, callback, priority) {
						this.addToQueue({
							msg: {
								data: object,
								type: type,
							},
							callback: callback
						}, priority);
					},
					addToQueue: function(data, priority) {
						if (priority) {
							this.queue.unshift(data);
						}
						else {
							this.queue.push(data);
						}
						if (!this.sendingData) {
							this.sendingData = true;
							this.restartDataSender();
						}
					},
					sender: function() {
						if (this.dataChannels.length) {
							while(this.queue.length) {
								var success = this.sendOnAvailableChannel(this.queue[0]);
								if (!success) {
									if (this.dataChannels.length < 5) {
										this.newPeerConnection(this.restartDataSender);
									}
									else {
										$timeout(this.restartDataSender, 100);
									}

									return;
								}
								else {
									this.queue.shift();

									if (this.failedTimeout) {
										$timeout.cancel(this.failedTimeout);
									}
									if (this.queue.length) {
										this.failedTimeout = $timeout(this.cancelDataSending, 10000);
									}
								}
							}
							this.sendingData = false;

						}
						else if(!this.listOfPeerConnections.length) {
							this.newPeerConnection(this.restartDataSender);
						}
						else {
							$timeout(this.restartDataSender, 100);
						}
					},
					restartDataSender: function() {
						dataSenders.list[to].sender();
					},
					cancelDataSending: function() {
						var instances = dataSenders.list[to].instances;
						for (var i = 0; i < instances.length; i++) {
							instances[i].failedCallback();
						}
						dataSenders.list[to].clean();
						dataSenders.list[to].queue.length = 0;
					}
				};

			}
		};

		dataSender.getSender = function(to, type, statusCallback) {
			return dataSenders.getSender(to, false, type, statusCallback);
		};

		var messageHandlers = {
			list: {},
			mainHandler: function(from) {
				return function(event) {
					var message = JSON.parse(event.data);
					var data = message.data;

					if (message.type && messageHandlers.list[message.type]) {
						messageHandlers.list[message.type](data, from);
						return;
					}
					else {
						console.log("hot message");
						console.log(event.data);
					}
				};
			},

			addHandler: function(handler, type) {
				this.list[type] = handler;
			}
		};

		dataSender.addMessageHandler = function(handler, type) {
			messageHandlers.addHandler(handler, type);
		};

		dataSender.onDataChannel = function (to) {
			return function(event) {
				dataSenders.getSender(to, true).addDataChannel(event.channel);
				dataSenders.getSender(to, true).addPeerConnection(event.channel);
			};
		};

		function createDesc(callback){
			return function(desc) {
				callback(desc);
			};
		}

		return dataSender;

	});
})();
