(function () {

	app.factory('init', function(fileTransfer, UWAP, chat, xmpp, model, $rootScope, $state, $http, constants, webrtc, utility, presence, call, search) {
		var init = {
			init: function() {
				globalModel = model;
				$rootScope.gotoState = function(state) {
					$state.go(state);
				};
				$rootScope.gotoState("chat");

				gatherInfoPart1();
			}
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

		function connectedCallback() {
			window.onbeforeunload = function() {
				console.log("Signing out");
				xmpp.logOff();
				return null;
			};

			webrtc.init();
			presence.init();
			chat.init();
			call.init();
			fileTransfer.init();
			search.init();

			gatherInfoPart2();
		}

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
		}

		return init;
	});

})();
