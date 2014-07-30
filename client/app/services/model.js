(function () {

	app.factory('model', function(constants, $sce, utility, $q, $rootScope) {
		
		var model = {};

		model.application = {
			title: "UNINETT WebRTC application",
			setTitle: function(title) {
				this.title = title;
			}
		};
		
		model.conference = {
			
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
			},
			closeActive: function() {
				model.conference.mediaActive = false;
				model.chat.getCurrent().conferenceOpen = false;
				this.src = "";
				this.active = false;
			},
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


		return model;
	});

})();
