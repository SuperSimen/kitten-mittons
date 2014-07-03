(function () {

	app.factory('fileSender', function(webrtc, model) {
		var fileSender = {
			init: function() {
				webrtc.addMessageHandler(fileHandler, "fileReceiver");
			}
		};

		function fileHandler(data) {

			//Use better ack system
			if (data.status === "fileAck") {
				if (fileSender.continueFileSending) {
					fileSender.continueFileSending();
				}
				else {
					console.error("ack without file sender");
				}
			}
			else if (data.status === "sliceAck") {
				if (listOfCallbacks[data.slice]) {
					listOfCallbacks[data.slice]();
					delete listOfCallbacks[data.slice];
				}
				else {
					console.error("ack without file sender");
				}

			}
		}

		fileSender.sendFile = function() {
			if (!model.file.file) {return console.error("no file!!");}

			var file = model.file.file;
			var size = file.size;
			var maxSize = 100*1024*1024;
			//	var maxSize = 1*1024;
			var totalSlices = Math.ceil(size / maxSize);

			signalFile("sof", totalSlices, file.name);

			fileSender.continueFileSending = function() {
				var totalNumber = 0;
				if (size < maxSize) {
					read(file, 1, 1, file.name ,signalEof);
				}
				else {
					fileSending(0)();
				}
			};

			var sliceCounter = 1;

			function fileSending(i) {
				return function () {
					var blob;
					if (i + maxSize > size) {
						blob = file.slice(i, size);
						read(blob, sliceCounter++, totalSlices, file.name, signalEof);
					}
					else {
						blob = file.slice(i, i + maxSize);
						read(blob, sliceCounter++, totalSlices, file.name, fileSending(i+maxSize));
					}

				};
			}

			function signalEof() {
				signalFile("eof", totalSlices, file.name);
			}
		};



		function read(file, slice, totalSlices, filename, callback) {
			var reader = new FileReader();

			reader.onerror = function(event) {
				console.error("File could not be read! Code " + event.target.error.code);
			};

			reader.onload = function(event) {
				var buffer = event.target.result;

				var array = btoa(buffer).match(/.{1,51200}/g);
				signalSlice("sos", slice, totalSlices, array.length, filename);

				listOfCallbacks[slice] = function() {
					for (var i in array) {
						sendFileChunk(array[i], "ongoing", slice, totalSlices, i, array.length, filename);
					}
					signalSlice("eos", slice, totalSlices, array.length, filename);
					if (callback) callback();
				};
			};
			reader.readAsBinaryString(file);
		}

		var listOfCallbacks = [];

		function sendFileChunk(chunk, status, slice, totalSlices, number, totalNumber, filename) {
			var tempFile = {
				base64: chunk,
				size: chunk.length,
				status: status,
				number: number,
				totalNumber: totalNumber,
				filename: filename,
				slice: slice,
				totalSlices: totalSlices
			};
			webrtc.sendObject(tempFile, "fileSender");
		}

		function signalFile(status, totalSlices, filename) {
			var tempFile = {
				status: status,
				filename: filename,
				totalSlices: totalSlices
			};
			webrtc.sendObject(tempFile, "fileSender");
		}

		function signalSlice(status, slice, totalSlices, totalNumber, filename) {
			var tempFile = {
				slice: slice,
				status: status,
				totalNumber: totalNumber,
				totalSlices: totalSlices,
				filename: filename
			};
			webrtc.sendObject(tempFile, "fileSender");
		}


		return fileSender;
	});

})();
