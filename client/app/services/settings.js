(function () {

	app.factory('settings', function() {

		var settings = {
			model: {
				mute: false
			}
		};
		
		/**
		 * Get or set the current mute state
		 * @param {Boolean} status (optional) The new mute state
		 * @returns {Boolean} Current mute state
		 */
		settings.mute = function(state) {
			
			if(state !== undefined) {
				settings.model.mute = !!state;
			}
			
			return settings.model.mute;
		};
				
		return settings;
		
	});

})();
