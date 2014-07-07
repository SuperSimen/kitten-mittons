(function () {

	app.factory('xmpp', function(constants) {
		var factory = {};

		var connection;
		factory.connect = function (jid, password, bosh, connectedCallback) {
			if (!jid|| !password || !bosh) {return;}

			connection = new Strophe.Connection(bosh);
			connection.connect(jid, password, statusCallback(connectedCallback));
			connection.addHandler(basicHandler);
		};

		factory.addHandler = function(handler, namespace, name, type) {
			connection.addHandler(handler, namespace, name, type);
		};

		factory.api = {
			mucUser: "http://jabber.org/protocol/muc#user",
			mucOwner: "http://jabber.org/protocol/muc#owner",
			discoInfo: "http://jabber.org/protocol/disco#info",
			register: "jabber:iq:register",
			muc: "http://jabber.org/protocol/muc",
			vcard: "vcard-temp",
			webrtc: "webrtc",
			data: "jabber:x:data",
			whois: "muc#roomconfig_whois"
		};

		factory.addMucPresenceHandler = function(callback) {
			connection.addHandler(callback, factory.api.mucUser, "presence");
		};
		factory.addMucMessageHandler = function (callback) {
			connection.addHandler(callback, null, "message", "groupchat" );
		};

		factory.getVCard = function(jid, callback) {
			var iq;
			if (jid) {
				iq = $iq({to: jid, type: 'get'});
			}
			else {
				iq = $iq({type: 'get'});
			}
			iq.c('vCard', {xmlns: factory.api.vcard});
			sendIQ(iq, callback);
		};

		factory.setVCard = function(properties) {
			var iq = $iq({type: 'set'}).c('vCard', {xmlns: factory.api.vcard});
			for (var i in properties) {
				iq.c(i).t(properties[i]).up();
			}
			sendIQ(iq);
		};

		var sendIQ = function(iq, successCallback, errorCallback) {
			console.log("sending iq " + iq);
			var temp = function (stanza) {
				console.log("temp");
				console.log(stanza);
				console.log(arguments);
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
					connectedCallback();
				}
			};
		}

		function send(obj) {
			connection.send(obj);
		}
		factory.send = function(obj) {
			connection.send(obj);
		};
		
		function basicHandler(input) {
			//console.log(input);
			return true;
		}

		factory.sendPrivateMessage = function(to, text) {
			var msg = $msg({to: to, type: "chat"}).c("body").t(text);
			send(msg);
		};

		factory.sendGroupMessage = function(to, text) {
			var msg = $msg({to: to, type: "groupchat"}).c("body").t(text);
			send(msg);
		};

		function sendPresenceType(to, type) {
			var msg = $pres({to: to, "type": type});
			send(msg);
		}

		logOff = function logOff() {
			send($pres({type: "unavailable"}));
		};


		function logOn() {
			send($pres());
		}

		function setStatus(show) {
			send($pres().c("show", show));
		}

		factory.joinRoom = function (roomId, userId) {
			var room = roomId + "@" + constants.xmppMucServerUrl;
			var to = room + "/" + userId;
			console.log("joining room: " + to);

			var pres = $pres({to: to}).c("x", {xmlns: factory.api.muc});
			send(pres);

		};

		factory.leaveRoom = function(roomId) {
			roomId = "temp"; //TODO: don't do this
			var to = roomId + "@" + constants.xmppMucServerUrl;
			var pres = $pres({to: to, type: "unavailable"}).c("x", {xmlns: factory.api.muc});
			send(pres);
		};

		factory.sendRoomConfig = function(to) {
			var iq = $iq({to: to, type: 'set'}).c('query', {xmlns: factory.api.mucOwner}).
				c('x', {xmlns: factory.api.data, type: 'submit'});

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
			var iq = $iq({to: to, type: 'get'}).c('query', {xmlns: factory.api.mucOwner});
			sendIQ(iq);

		};
		return factory;
	});
	
})();
