(function () {

	app.factory('fileSender', function(webrtc, model) {
		var fileSender = {
			init: function() {
				webrtc.addMessageHandler(fileHandler, "fileReceiver");
			}
		};

		var listOfCallbacks = [];

		function fileHandler(data) {
			console.log(data);

			//Use better ack system
			if (data.status === "sof_ack") {
			console.log("sof_ack");
				if (fileSender.continueFileSending) {
					fileSender.continueFileSending();
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
		}

		fileSender.sendFile = function(to) {
			if (!model.file.file) {return console.error("no file!!");}
			webrtc.getSender(to, "fileSender", function(sender) {
				console.log("received sender");
				startSending(sender);
			});
		};

		function startSending(sender) {
			console.log("starting sending");

			var file = model.file.file;
			var size = file.size;
			var maxSize = 100*1024*1024;
			var totalSlices = Math.ceil(size / maxSize);
			var id = generateRandomFileId();

			signalFile(id, "sof", totalSlices, file.name);

			fileSender.continueFileSending = function() {
					console.log("continues");
				var totalNumber = 0;
				if (size < maxSize) {
					read(file, 1, eof);
				}
				else {
					senderLoop(0)();
				}
			};

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
				sender.close();
			}

			function read(blob, slice, callback) {
				var reader = new FileReader();

				reader.onerror = function(event) {
					console.error("File could not be read! Code " + event.target.error.code);
				};

				reader.onload = function(event) {
					var buffer = event.target.result;

					var array = btoa(buffer).match(/.{1,51200}/g);
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
				sender.send(tempFile);
			}

			function signalFile(id, status, totalSlices, filename) {
				var tempFile = {
					id: id,
					status: status,
					filename: filename,
					totalSlices: totalSlices
				};
				sender.send(tempFile);
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
				sender.send(tempFile);
			}

		}

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
