(function () {

	app.directive('baFileSelector', function () {

		function link(scope, element, attr) {
			element[0].onchange = function(event) {
				scope.$apply(function() {
					scope.file.file = event.target.files[0];
				});
			};
		}

		return {
			link: link,
			scope: {
				file: '='
			}
		};
	});
	app.directive('baProgressBar', function () {

		function link(scope, element, attr) {
			scope.$watch(function() {return scope.progress.value;}, function(newValue) {
				element[0].style.cssText = "width: " + (newValue * 100) + "%;";
			});
		}

		return {
			link: link,
			scope: {
				progress: '='
			}
		};
	});

	app.directive('baCenterVideo', function ($window, $timeout) {

		function link(scope, element, attr) {
			var calculatePosition = function() {
				return (element.height() - element.parent().height()) / 2;
			};

			function positionElement (value) {
				console.log("positioning " + value);
				element.css({"position" : "absolute", "top" : -value});
			}

			globalElement = element;

			scope.$watch(calculatePosition, function(newValue) {
				positionElement(newValue);
			});

			function waitForVideo() {
				if (element[0].readyState === 4) {
					console.log("video ready");
					positionElement(calculatePosition());
				}
				else {
					console.log("waiting for video");
					$timeout(function() {
						waitForVideo();
					}, 500);
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
})();
