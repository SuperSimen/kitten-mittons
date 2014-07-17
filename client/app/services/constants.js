(function () {

	app.factory('constants', function() {
		var constants = {
			iceServers: [
				{"url":"stun:stun.akademia.no:3478"},
				{
					"url":"turn:stun.akademia.no:3478",
					"username":"test",
					"credential":"1234"
				},
				{
					"url":"turn:stun.akademia.no:3478?transport=tcp",
					"username":"test",
					"credential":"1234"
				}
			],
			conferenceUrl: "https://meet.akademia.no",
			uwap: {
				orgUnit: "uwap:group:type:orgUnit",
				adHoc: "uwap:group:type:ad-hoc"
			},
			xmpp: {
				boshUrl: "https://meet-test.akademia.no/http-bind",
				serverUrl: "meet-test.akademia.no",
				mucServerUrl: "conference.meet-test.akademia.no",
				mucUser: "http://jabber.org/protocol/muc#user",
				mucOwner: "http://jabber.org/protocol/muc#owner",
				discoInfo: "http://jabber.org/protocol/disco#info",
				register: "jabber:iq:register",
				muc: "http://jabber.org/protocol/muc",
				vcard: "vcard-temp",
				webrtc: "webrtc",
				data: "jabber:x:data",
				whois: "muc#roomconfig_whois",
				client: "jabber:client",
				roster: "jabber:iq:roster"
			}
		};

		return constants;

	});	

	app.factory('utility', function(constants) {
		var utility = {};

		utility.getJidFromId = function(id) {
			if (true) {
				return id;
			}
			else {
				return id + "@" + constants.xmpp.serverUrl;
			}
		};

		utility.getIdFromJid = function(jid) {
			return utility.getBareJid(jid);
		};
		utility.getGroupIdFromJid = function(jid) {
			return jid.substring(0, jid.indexOf("@"));
		};

		utility.getBareJid = function(jid) {
			if (jid.indexOf("/") !== -1) {
				return jid.substring(0, jid.indexOf("/"));
			}
			else {
				return jid;
			}
		};

		utility.bytesToSize = function (bytes, precision) { 
			var kilobyte = 1024;
			var megabyte = kilobyte * 1024;
			var gigabyte = megabyte * 1024;
			var terabyte = gigabyte * 1024;

			if ((bytes >= 0) && (bytes < kilobyte)) {
				return bytes + ' B';

			} else if ((bytes >= kilobyte) && (bytes < megabyte)) {
				return (bytes / kilobyte).toFixed(precision) + ' KB';

			} else if ((bytes >= megabyte) && (bytes < gigabyte)) {
				return (bytes / megabyte).toFixed(precision) + ' MB';

			} else if ((bytes >= gigabyte) && (bytes < terabyte)) {
				return (bytes / gigabyte).toFixed(precision) + ' GB';

			} else if (bytes >= terabyte) {
				return (bytes / terabyte).toFixed(precision) + ' TB';

			} else {
				return bytes + ' B';
			}
		};

		return utility;
	});

})();
