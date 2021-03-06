(function () {

	app.factory('constants', function() {
		var constants = {
			thisUrl: "http://webrtc.akademia.no",
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
				adHoc: "uwap:group:type:ad-hoc",
				inst: "uwap:grp:inst"
			},
			xmpp: {
				boshUrl: "https://meet-test.akademia.no/http-bind",
				serverUrl: "meet-test.akademia.no",
				mucServerUrl: "conference.meet-test.akademia.no",
				uninettJabber: "jabber.uninett.no",
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


})();
