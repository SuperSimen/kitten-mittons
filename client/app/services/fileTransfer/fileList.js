(function () {
	app.factory('fileList', function() {
		fileList = {
			list: {},
			add: function(id, filename, user, sending, size, roomId) {
				if (this.list[id]) {
					return console.log("id not unique");
				}
				this.list[id] = {
					id: id,
					roomId: roomId,
					filename: filename,
					user: user,
					sending: sending,
					progress: 0,
					finished: false,
					accepted: false,
					cancelled: false,
					acceptPossible: function() {
						return !this.accepted && !this.cancelled && !this.sending;
					},
					cancelPossible: function() {
						if (!this.cancelled) {
							if (this.sending) {
								if (!this.finished) {
									return true;
								}
							}
							else {
								if (this.accepted) {
									return !this.finished;
								}
								else {
									return true;
								}
							}
						}
						return false;
					},
					accept: function() {
						this.accepted = true;
					},
					cancel: function() {
						this.cancelled = true;
					},
					size: size,
				};

				if (roomId) {
					model.chat.get(utility.getIdFromJid(roomId)).addFileMessage(id);
				}
				else {
					model.chat.get(utility.getIdFromJid(user)).addFileMessage(id);
				}

				return this.list[id];
			},
			get: function(id) {
				if (!this.list[id]) {
					console.log("file id does not exist");
				}
				return this.list[id];
			},
		};

		return fileList;
	});
})();
