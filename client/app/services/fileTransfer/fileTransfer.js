(function () {
	app.factory('fileTransfer', function(xmpp, model, $rootScope, fileSender, fileReceiver, utility, $q, $timeout) {
		var fileTransfer = {
			init: function() {
				fileSender.init();
				fileReceiver.init();

				xmpp.addHandler(xmppHandlers.fileInvite, null, "message", "fileInvite");
				xmpp.addHandler(xmppHandlers.fileInviteResponse, null, "message", "fileInviteResponse");
			}
		};

		var xmppHandlers = {
		
			fileInvite: function(data) {
				var body = data.getChildrenByTagName("body");
				if (body) {
					
					var request = JSON.parse(body[0].children[0].data);
					
					$rootScope.$apply(function() {
						model.chat.get(request.roomId).addFileInviteMessage(request);
					});
				} 
			},
			fileInviteResponse: function(data) {
				
				var body = data.getChildrenByTagName("body");
				
				if (body) {
					var response = JSON.parse(body[0].children[0].data); // response.roomId
					model.file.resolveRequest(response.id, response.isAccepted);
				} 
			},
		};

		fileTransfer.sendFileInvite = function(friend_id, room_id, file) {
			
			var request = model.file.createRequest(friend_id, room_id, file);
			
			var request_data = {
				name: file.name,
				size: file.size,
				id: request.id,
				roomId: room_id,
				from: model.user.info.xmpp.jid
			};
			
			xmpp.sendMessage(friend_id, JSON.stringify(request_data), "fileInvite");			
			return request.task.promise;
		};
		
		fileTransfer.respondFileInvite = function(from_id, room_id, request_id, is_accepted) {
						
			var response_data = {
				roomId: room_id,
				id: request_id,
				isAccepted: is_accepted
			};
			
			xmpp.sendMessage(from_id, JSON.stringify(response_data), "fileInviteResponse");
			
		};

		fileTransfer.sendFiles = function(to, files) {
			var jid = utility.getJidFromId(to);
			if (!files) {

			}
			else {
				if (!files.length) {return console.error("no files!!");}
				for (var i = 0; i < files.length; i++) {
					fileSender.sendFile(files[i], jid);
				}
			}
		};


		var el = null;
				
		fileTransfer.openDialog = function () {
			
			var defer = $q.defer();
			
			function onFileSubmitted(event) {
				if(el.files.length > 0) {
					defer.resolve(el.files[0]);
				} else {
					defer.reject('No files available');
				}
			}
			
			if(!el) {
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
			
			$timeout(function() {
				el.dispatchEvent(e);
			},0);
			
			return defer.promise;
		};
		
		return fileTransfer;
	});

})();
