(function () {
	app.factory('initialize', function(fileTransfer, UWAP, chat, xmpp,  userInfo, $rootScope, $state, $http, constants, webrtc, utility, presence, call, search, $window) {
		var init = {
			init: function() {
				$rootScope.gotoState = function(state) {
					$state.go(state);
				};
				$rootScope.gotoState("chat");

				gatherInfoPart1();
			}
		};
		

		function gatherInfoPart1 () { 
			$http.get('/api/info').success(function(data, status) {
				userInfo.user.info = data;
				userInfo.user.token = data.token;
				userInfo.user.id = data.xmpp.jid;

				if (userInfo.user.info.xmpp.registered) {
					xmpp.connect(userInfo.user.info.xmpp.jid, userInfo.user.info.xmpp.password, constants.xmpp.boshUrl, connectedCallback);
				}

			}).error(utility.handleHttpError);
		}

		function connectedCallback() {
			$window.onbeforeunload = function() {
				xmpp.runSync(function () {
					call.cleanUp();
				});
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
			UWAP.getGroups(userInfo.user.token, function (data) {
				var groups = data.Resources;
				for (var i in groups) {
					var group = groups[i];
					if (group.groupType === constants.uwap.orgUnit || group.groupType === constants.uwap.adHoc || group.groupType === constants.uwap.inst) {
						var groupId = encodeURIComponent(group.id).toLowerCase();
						userInfo.groups.create(groupId, group.displayName);
						xmpp.joinRoom(groupId);
					}
				}
			}); 
			UWAP.getRealms(userInfo.user.token, function (data) {
				userInfo.user.realms = data;
			}); 

		}

		return init;
	});

})();
