(function () {
    
	app.directive("ngAutoScroll", function() { 
		return function(scope, element, attrs) {
			scope.$watch(function() {return element[0].scrollHeight;}, function() {
				element.scrollTop(element[0].scrollHeight);
			});
		};
	});

	app.directive("ngAudio", function(){
		return function(scope, element, attrs){
			element[0].loop = true;
			scope.playAudio = function(status) {
				if(status) {
					element[0].play();
				}
				else {
					element[0].pause();
				}
			};
		};
	});

	app.directive('baFileSelector', function () {

		function link(scope, element, attr) {
			element[0].onchange = function(event) {
				scope.$apply(function() {
					scope.files = event.target.files;
				});
			};
		}

		return {
			link: link,
			scope: {
				files: '='
			}
		};
	});
	app.directive('baProgressBar', function () {
		function link(scope, element, attr) {
			scope.$watch(function() {return scope.progress;}, function(newValue) {
				element.css({'width' : newValue + "%"});
			});
		}

		return {
			link: link,
			scope: {
				progress: '='
			}
		};
	});

	app.directive('baClick', function() {
		function link(scope, element, attr) {
			element.bind('click', function(event) {
				event.stopPropagation();
			});
		}

		return {
			link: link
		};

	});


	app.directive('baCenterVideo', function ($window, $timeout) {

		function link(scope, element, attr) {
			function calculatePosition() {
				return (element.height() - element.parent().height()) / 2;
			}

			function positionElement (value) {
				element.css({"position" : "absolute", "top" : -value});
			}

			scope.$watch(calculatePosition, function(newValue) {
				positionElement(newValue);
			});
			scope.$watch(function() {
				return scope.inverse;
			}, function(newValue) {
				waitForVideo();
			});
			scope.$watch(function() {
				return scope.video.active;
			}, function(newValue) {
				waitForVideo();
			});

			function waitForVideo() {
				if (element[0].readyState === 4) {
					positionElement(calculatePosition());
					element.css("visibility", "visible");
				}
				else {
					element.css("visibility", "hidden");
					$timeout(function() {
						waitForVideo();
					}, 50);
				}
			}
			waitForVideo();

			$window.onresize = function() {
				scope.$apply();
			};
		}

		return {
			link: link,
		};
	});

	app.directive('baAutoUpdate', function($timeout) {
		function link (scope, element, attr) {
			scope.$watch(function() {return attr.baAutoUpdate;}, function(newValue) {
				if (newValue) {
					waitForVideo();
				}
			});
			function waitForVideo() {
				if (element[0].readyState === 4) {
					scope.$apply();
				}
				else {
					$timeout(function() {
						waitForVideo();
					}, 50);
				}
			}
		}

		return {
			link: link,
		};
	});
})();
