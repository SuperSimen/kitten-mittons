/* 
 * Provides an interface to get profile images for users
 */

(function () {

	app.factory('userImage', function($q, userInfo, UWAP) {
		
		service = {};
		
		// @TODO: Look in other realms?
		var realm = "uninett.no";
		
		/**
		 * Cached profile pictures
		 * @type type Object userid to base64 encoded image
		 */
		var _cache = {};
		
		/**
		 * 
		 * @param {type} user
		 * @returns {undefined}
		 */
		service.getPicture = function(user) {
			
			// @TODO: Handle cases where a duplicate request comes in before the
			// first has resolved?
			
			var task = $q.defer();
			
			if(user.userid in _cache) {
				
				// Profile picture has been found before
				
				if(_cache[user.userid] === null) {
					setTimeout(function() {
						task.reject(_cache[user.userid]);
					}, 0);
				} else {
					setTimeout(function() {
						task.resolve(_cache[user.userid]);
					}, 0);
				}
				
				return task.promise;
			}
			
			var onSearchComplete = function (data) {
				
				for(var i = 0; i < data.people.length; i++) {
					
					var person = data.people[i];
					
					console.log(person);
					
					if(person.userid === user.userid) {
						
						// Found matching userid
						
						if(person.jpegphoto) {
							_cache[user.userid] = "data:image/jpeg;base64," + person.jpegphoto;
							task.resolve(_cache[user.userid]);
						} else {
							// User doesn't have an image
							_cache[user.userid] = null;
							task.reject(null);
						}
						
						return;
					}
					
				}
				
				task.reject(null);
				
			};
			
			// Search by user name
			UWAP.getPeople(userInfo.user.token, onSearchComplete, realm, 
				user.name);
		
			return task.promise;
			
		};
		
		window.userImageService = service;
		
		return service;
		
	});
	
})();
