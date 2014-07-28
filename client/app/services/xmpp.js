(function () {

	app.factory('xmpp', function(constants, $timeout, model, utility) {
		var factory = {};

		var connection;
		factory.connect = function (jid, password, bosh, connectedCallback) {
			if (!jid|| !password || !bosh) {return;}

			connection = new Strophe.Connection(bosh);
			connection.connect(jid, password, statusCallback(connectedCallback));
			factory.addHandler(iqHandler, null, "iq", "set");
			factory.addHandler(messageHandler, null, "message");
		};

		factory.addHandler = function(callback, namespace, name, type, id, from) {
			function handler(stanza) {
				callback(parseStanza(stanza));
				return true;
			}
			connection.addHandler(handler, namespace, name, type, id, from);
		};

		function addTemporaryHandler(callback, namespace, name, type, id, from) {
			function handler(stanza) {
				callback(parseStanza(stanza));
				return false;
			}
			connection.addHandler(handler, namespace, name, type, id, from);
		}

		function iqHandler (data) {
			var iq = $iq({type: 'result', id: data.id});
			send(iq);
		}

		function messageHandler (data) {
			if (data.type !== "ack" && data.type !== "groupchat") {
				var msg = $msg({to: data.from, type: 'ack', id: data.id});
				send(msg);
			}
		}

		factory.getVCard = function(jid, callback) {
			var iq;
			if (jid) {
				iq = $iq({to: jid, type: 'get'});
			}
			else {
				iq = $iq({type: 'get'});
			}
			iq.c('vCard', {xmlns: constants.xmpp.vcard});
			sendIQ(iq, callback);
		};

		factory.setVCard = function(properties) {
			var iq = $iq({type: 'set'}).c('vCard', {xmlns: constants.xmpp.vcard});
			for (var i in properties) {
				iq.c(i).t(properties[i]).up();
			}
			sendIQ(iq);
		};

		var sendIQ = function(iq, successCallback, errorCallback) {
			var temp = function (stanza) {
				if (!stanza) {
					console.error("could not send IQ");
				}
				else {
					//console.log(stanza);
				}
			};
			connection.sendIQ(iq,
					(successCallback ? successCallback : temp),
					(errorCallback ? errorCallback : temp));
		};

		function statusCallback(connectedCallback) {
			return function (status) {
				console.log("Status " + status);
				if (status === Strophe.Status.CONNECTED) {
					logOn();
					presenceLoop();
					connectedCallback();
				}
			};

			function presenceLoop() {
				$timeout(function() {
					console.log("sending presence");
					send($pres());
					presenceLoop();
				}, 30*1000);
			}
		}

		function send(obj) {
			connection.send(obj);
		}
		factory.send = function(obj) {
			send(obj);
		};

		var messageCounter = 0;
		factory.sendMessage = function (to, text, type, callback) {
			var id = utility.randomString() + messageCounter++;
			var msg = $msg({to: to, type: type, id: id}).c("body").t(text);

			addTemporaryHandler(handler, null, "message", "ack", id);

			send(msg);

			function handler(data) {
				if (callback) {
					callback();
				}
			}
		};

		factory.sendGroupMessage = function(to, text) {
			var msg = $msg({to: to, type: "groupchat"}).c("body").t(text);
			send(msg);
		};

		factory.getRoster = function() {
			var iq = $iq({type: 'get'}).c('query', {xmlns: constants.xmpp.roster});
			sendIQ(iq);
		};

		factory.addToRoster = function(jid, callback) {
			var iq = $iq({type: 'set'}).c('query', {xmlns: constants.xmpp.roster})
			.c('item', {jid: jid});
			sendIQ(iq, callback);
		};

		factory.removeFromRoster = function(jid, callback) {
			var iq = $iq({type: 'set'}).c('query', {xmlns: constants.xmpp.roster})
			.c('item', {jid: jid, subscription: "remove"});
			sendIQ(iq, callback);
		};


		factory.sendPresenceType = function (to, type) {
			var msg = $pres({to: to, "type": type});
			send(msg);
		};

		sendPresenceType = function (to, type) {
			var msg = $pres({to: to, "type": type});
			send(msg);
		};

		factory.logOff = function() {
			send($pres({type: "unavailable"}));
		};


		function logOn() {
			send($pres());
		}


		function setStatus(show) {
			send($pres().c("show", show));
		}

		factory.joinRoom = function (roomId) {
			var room = roomId + "@" + constants.xmpp.mucServerUrl;
			var to = room + "/" + model.user.info.nickname;

			var pres = $pres({to: to}).c("x", {xmlns: constants.xmpp.muc});

			send(pres);
		};

		factory.sendRoomConfig = function(to) {
			var iq = $iq({to: to, type: 'set'}).c('query', {xmlns: constants.xmpp.mucOwner}).
				c('x', {xmlns: constants.xmpp.data, type: 'submit'});

			var fields = [
				{a: "FORM_TYPE", b: "http://jabber.org/protocol/muc#roomconfig"},
				{a: 'muc#roomconfig_roomname', b: ""},
				{a: 'muc#roomconfig_roomdesc', b: ""},
				{a: 'muc#roomconfig_changesubject', b: ""},
				{a: 'muc#roomconfig_publicroom', b: ""},
				{a: 'muc#roomconfig_persistentroom', b: ""},
				{a: 'muc#roomconfig_moderatedroom', b: ""},
				{a: 'muc#roomconfig_membersonly', b: ""},
				{a: 'muc#roomconfig_roomsecret', b: ""},
				{a: 'muc#roomconfig_whois', b: "anyone"}
			];

			for (var i in fields) {
				iq.c('field', {var: fields[i].a}).c('value').t(fields[i].b).up().up();
			}
			console.log("sending room config");
			sendIQ(iq);
		};

		factory.getRoomForm = function(to) {
			var iq = $iq({to: to, type: 'get'}).c('query', {xmlns: constants.xmpp.mucOwner});
			sendIQ(iq);

		};

		function parseStanza(stanza) {
			var object = {};

			if (stanza.tagName) {
				object.tagName = stanza.tagName;
			}
			for (var i = 0; i < stanza.attributes.length; i++) {
				var node = stanza.attributes[i];
				object[node.nodeName] = node.value;
			}

			getChildren(stanza.childNodes, object);

			function getChildren(childNodes, currentObject) {
				if (childNodes && childNodes.length) {
					currentObject.children = [];
					for (var i = 0; i < childNodes.length; i++) {
						var child = childNodes[i];
						var tempChild = {};
						if (child.tagName) {
							tempChild.tagName = child.tagName;
						}
						if (child.data) {
							tempChild.data = child.data;
						}
						if (child.attributes) {
							for (var k = 0; k < child.attributes.length; k++) {
								node = child.attributes[k];
								tempChild[node.nodeName] = node.value;
							}
						}
						var next = getChildren(child.childNodes, tempChild);
						if (Object.keys(next).length) {
							currentObject.children.push(next);
						}
					}
					currentObject.getChildrenByTagName = function (tag) {
						var temp = [];
						for (var i in currentObject.children) {
							if (currentObject.children[i].tagName === tag) {
								temp.push(currentObject.children[i]);
							}
						}
						return temp;
					};
				}
				else {
					currentObject.getChildrenByTagName = function() {};
				}
				return currentObject;
			}

			return object;

		}
		return factory;
	});
	
})();
