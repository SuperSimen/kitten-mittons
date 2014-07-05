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
})();
