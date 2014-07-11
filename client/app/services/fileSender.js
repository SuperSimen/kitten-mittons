(function () {

	app.factory('fileSender', function($rootScope, webrtc, model) {
		var fileSender = {
			init: function() {
				webrtc.addMessageHandler(dataHandlers.main, "fileReceiver");
			}
		};

		var dataHandlers = {
			list: {},
			main: function(data) {
				if (data.id && dataHandlers.list[data.id]) {
					dataHandlers.list[data.id](data);
				}
				else {
					console.log("hot data");
					console.log(data);
				}
			},

			add: function(handler, id) {
				if (dataHandlers.list[id]) {
					return console.error("handler id exists");
				}
				dataHandlers.list[id] = handler;
			}
		};


		fileSender.sendFile = function(to) {
			if (!model.file.selectedFile) {return console.error("no file!!");}
			var progress = {
				counter: 0,
				calculate: function() {
					if (this.totalSlices && this.sliceSize) {
						return (this.counter / (this.totalSlices * this.sliceSize)) * 100;
					}
					return false;
				}
			};
			var sender = webrtc.getFileSender(to, "fileSender", function(status) {
				if (status === "sent") {
					progress.counter++;
					if (progress.counter % 25 === 0) {
						var value = progress.calculate();
						if (value) {
							$rootScope.$apply(function() {
								model.file.list[id].progress = value;
							});
						}

					}
				}
			});

			var file = model.file.selectedFile;
			var size = file.size;
			var maxSize = 100*1024*1024;
			var totalSlices = Math.ceil(size / maxSize);
			var id = generateRandomFileId();
			
			progress.totalSlices = totalSlices;
			model.file.add(id, file.name, to, true);

			dataHandlers.add(fileHandler, id);
			var listOfCallbacks = [];

			function fileHandler(data) {
				if (data.status === "sof_ack") {
					console.log("sof_ack");
					if (continueFileSending) {
						continueFileSending();
					}
					else {
						console.error("ack without file sender");
					}
				}
				else if (data.status === "sos_ack") {
					if (listOfCallbacks[data.slice]) {
						listOfCallbacks[data.slice]();
						delete listOfCallbacks[data.slice];
					}
					else {
						console.error("ack without file sender");
					}
				}
				else if (data.status === "eof_ack") {
					sender.finished();
					$rootScope.$apply(function() {
						model.file.remove(id);
					});
					//sender = null;
				}
			}

			signalFile(id, "sof", totalSlices, file.name);

			function continueFileSending () {
				if (size < maxSize) {
					read(file, 1, eof);
				}
				else {
					senderLoop(0)();
				}
			}

			var sliceCounter = 1;

			function senderLoop(i) {
				return function () {
					console.log("looping");
					var blob;
					if (i + maxSize > size) {
						blob = file.slice(i, size);
						read(blob, sliceCounter++, eof);
					}
					else {
						blob = file.slice(i, i + maxSize);
						read(blob, sliceCounter++, senderLoop(i+maxSize));
					}

				};
			}

			function eof() {
				signalFile(id, "eof", totalSlices, file.name);
	
			}

			function read(blob, slice, callback) {
				var reader = new FileReader();

				reader.onerror = function(event) {
					console.error("File could not be read! Code " + event.target.error.code);
				};

				reader.onload = function(event) {
					var buffer = event.target.result;

					var array = btoa(buffer).match(/.{1,51200}/g);
					if (!progress.sliceSize) progress.sliceSize = array.length;

					signalSlice(id, "sos", slice, totalSlices, array.length, file.name);

					listOfCallbacks[slice] = function() {
						for (var i in array) {
							sendFileChunk(id, array[i], "ongoing", slice, totalSlices, i, array.length, file.name);
						}
						signalSlice(id, "eos", slice, totalSlices, array.length, file.name);
						if (callback) callback();
					};
				};
				reader.readAsBinaryString(blob);
			}


			function sendFileChunk(id, chunk, status, slice, totalSlices, number, totalNumber, filename) {
				var tempFile = {
					id: id,
					base64: chunk,
					size: chunk.length,
					status: status,
					number: number,
					totalNumber: totalNumber,
					filename: filename,
					slice: slice,
					totalSlices: totalSlices
				};
				sender.send(tempFile, "fileSender");
			}

			function signalFile(id, status, totalSlices, filename) {
				var tempFile = {
					id: id,
					status: status,
					filename: filename,
					totalSlices: totalSlices
				};
				sender.send(tempFile, "fileSender");
			}

			function signalSlice(id, status, slice, totalSlices, totalNumber, filename) {
				var tempFile = {
					id: id,
					slice: slice,
					status: status,
					totalNumber: totalNumber,
					totalSlices: totalSlices,
					filename: filename
				};
				sender.send(tempFile, "fileSender");
			}
		};

		var fileCounter = 0;

		function generateRandomFileId() {
			var me = model.user.info.xmpp.jid;
			var userid = me.substring(0,me.indexOf("@"));
			var id = userid + "-" + Math.random().toString(36).substring(7) + "-" + fileCounter++;
			console.log(id);
			return id;
		}

		return fileSender;
	});

})();
