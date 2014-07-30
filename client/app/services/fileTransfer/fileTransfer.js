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
					var file = JSON.parse(body[0].children[0].data);

					$rootScope.$apply(function() {
						var fileModel = model.file.add(file.id, file.filename, data.from, false, file.size, file.roomId);
						if (!fileModel.roomId) {
							respondFileInvite(fileModel, true);
						}
						else {
							fileModel.pending = true;
							fileModel.accept = function() {
								console.log("accept");
								this.accepted = true;
								this.pending = false;
								respondFileInvite(fileModel, true);
							};
							fileModel.cancel = function() {
								console.log("cancel");
								this.cancelled = true;
								this.pending = false;
								respondFileInvite(fileModel, false);
							};
						}
					});
				} 
			},
			fileInviteResponse: function(data) {
				var body = data.getChildrenByTagName("body");

				if (body) {
					var response = JSON.parse(body[0].children[0].data);
					var fileModel = model.file.get(response.id);

					if (fileModel) {
						if (response.isAccepted) {
							fileModel.task.resolve();
						}
						else {
							fileModel.task.reject();
						}
					}
				} 
			},
		};

		function sendFileInvite (file) {
			file.task = $q.defer();
			xmpp.sendMessage(file.user, JSON.stringify(file), "fileInvite");			
			return file.task.promise;
		}

		function respondFileInvite (file, isAccepted) {
			var response_data = {
				id: file.id,
				isAccepted: isAccepted
			};

			xmpp.sendMessage(file.user, JSON.stringify(response_data), "fileInviteResponse");
		}

		fileTransfer.sendFile = function(to, file, roomId) {
			var jid = utility.getJidFromId(to);
			var id = generateRandomFileId();
			var fileModel = model.file.add(id, file.name, to, true, file.size, roomId);
			fileModel.pending = true;

			sendFileInvite(fileModel).then(send);

			function send() {
				console.log("send");
				fileModel.pending = false;

				fileSender.sendFile(file, jid, fileModel);
			}
		};

		var fileCounter = 0;

		function generateRandomFileId() {
			var me = model.user.info.xmpp.jid;
			var userid = me.substring(0,me.indexOf("@"));
			var id = userid + "-" + utility.randomString() + "-" + fileCounter++;
			return id;
		}

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
