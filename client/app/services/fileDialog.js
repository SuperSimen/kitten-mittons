/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


(function () {

	app.factory('fileDialog', function($q) {
		
		var el = null;
				
		function getFileWithDialog() {
			
			var defer = $q.defer();
			
			function onFileSubmitted(event) {
				if(el.files.length > 0) {
					defer.resolve(el.files[0]);
				} else {
					defer.reject('No files available');
				}
			};
			
			if(!el) {
			
				console.log('creating new input');
			
				el = document.createElement('input');

				el.id = "fileupload-faux";
				el.setAttribute('type', 'file');

				el.style.position = "fixed";
				el.style.left = "-100px";

				document.body.appendChild(el);
				

			}
			
			el.onchange = onFileSubmitted;
			
			var e =  new MouseEvent('click', {
				'view': window,
				'bubbles': true,
				'cancelable': true
			});
			
			el.dispatchEvent(e);
			
			return defer.promise;
			
		}
		
		return {
			open: getFileWithDialog
		};
		
	});
	
})();