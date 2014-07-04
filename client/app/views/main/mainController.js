app.controller( 'mainController', function( $scope, model, main, xmpp, UWAP, $timeout, constants, $sce, webrtc, fileSender) {
	$scope.auth = model.auth;
	$scope.friends = model.friends;
	$scope.search = model.search;
	$scope.userInfo = model.userInfo;
	$scope.chat = model.chat;
	$scope.webrtc = model.webrtc;
	$scope.file = model.file;
	$scope.progress = model.progress;

	$scope.getGroupMembers = function(groupId) {
		main.getGroupMembers(groupId);
	};
	$scope.getDisco = function() {
		xmpp.disco();	
	};
	$scope.setRealm = function(realm) {
		model.search.currentRealm = realm;
		main.search();
	};
	$scope.chatKeyDown = function(event) {
		if (event.keyCode === 13 && $scope.chatMessage) {
			xmpp.sendGroupMessage("temp@" + constants.xmppMucServerUrl, $scope.chatMessage);
			$scope.chatMessage = "";
		}
	};
	$scope.getVideo = function(id) {
		if (model.webrtc.video['video'+ id + 'src']) {
			return model.webrtc.video['video'+ id + 'src'];
		}
	};
	var firstClick = {
		webrtc: true
	};
	$scope.clickTab = function(tab) {
		$scope.selectedTab = tab;
		if (tab === 'webrtc' && firstClick.webrtc) {
			firstClick.webrtc = false;
		}
	};
	$scope.sendFile = function(to) {
		fileSender.sendFile();
	};
	$scope.call = function(to) {
		if (to)	{
			webrtc.call(to.id);
		}
	};


	//TODO: move to main.js
	var timeoutPromise;
	$scope.$watch(function() {return $scope.search.query;}, function(newValue) {
			if (newValue) {
				if (timeoutPromise) {
					$timeout.cancel(timeoutPromise);
				}
				timeoutPromise = $timeout(function() {
					model.search.unsettable = false;
					main.search();
				}, 200);
			}
			else {
				model.search.unsettable = true;
				model.search.clearResults();
			}
	});

});

app.controller('animationController', function($scope) {

	var animations = [
		"bounce",
		"flash",
		"pulse",
		"rubberBand",
		"shake",
		"swing",
		"tada",
		"wobble",
		"bounceIn",
		"bounceInDown",
		"bounceInLeft",
		"bounceInRight",
		"bounceInUp",
		"bounceOut",
		"bounceOutDown",
		"bounceOutLeft",
		"bounceOutRight",
		"bounceOutUp",
		"fadeIn",
		"fadeInDown",
		"fadeInDownBig",
		"fadeInLeft",
		"fadeInLeftBig",
		"fadeInRight",
		"fadeInRightBig",
		"fadeInUp",
		"fadeInUpBig",
		"fadeOut",
		"fadeOutDown",
		"fadeOutDownBig",
		"fadeOutLeft",
		"fadeOutLeftBig",
		"fadeOutRight",
		"fadeOutRightBig",
		"fadeOutUp",
		"fadeOutUpBig",
		"flip",
		"flipInX",
		"flipInY",
		"flipOutX",
		"flipOutY",
		"lightSpeedIn",
		"lightSpeedOut",
		"rotateIn",
		"rotateInDownLeft",
		"rotateInDownRight",
		"rotateInUpLeft",
		"rotateInUpRight",
		"rotateOut",
		"rotateOutDownLeft",
		"rotateOutDownRight",
		"rotateOutUpLeft",
		"rotateOutUpRight",
		"slideInDown",
		"slideInLeft",
		"slideInRight",
		"slideOutLeft",
		"slideOutRight",
		"slideOutUp",
		"hinge",
		"rollIn",
		"rollOut"];

	var animation = "";
	$scope.generateRandomAnimation = function() {
		if (true) {return "";}
		if (animation) {return animation;}

		var randomIndex = parseInt((Math.random() * animations.length), 10);
		var randomTime = parseInt((Math.random() * 5 + 5), 10);
		animation = "-webkit-animation: " + animations[randomIndex] + " " + randomTime + "s;";

		return animation;
	};

});
