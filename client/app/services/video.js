(function () {

	app.factory('video', function(model, $sce, $rootScope) {
		var video = {
			init: function() {
				navigator.webkitGetUserMedia(
					{audio: false, video: true},
					function(stream) {
						$rootScope.$apply(function() {
							model.video.src = $sce.trustAsResourceUrl(URL.createObjectURL(stream));
						});
					}, function() {
						console.log(arguments);
					}
				);

			}
		};

		return video;
	});
})();
