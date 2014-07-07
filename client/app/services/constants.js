(function () {

	app.factory('constants', function() {
		var constants = {
			boshUrl: "https://meet-test.akademia.no/http-bind",
			xmppServerUrl: "meet-test.akademia.no",
			xmppMucServerUrl: "conference.meet-test.akademia.no",
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
			uwap: {
				orgUnit: "uwap:group:type:orgUnit",
				adHoc: "uwap:group:type:ad-hoc"
			}
		};

		return constants;
			
	});	

})();
