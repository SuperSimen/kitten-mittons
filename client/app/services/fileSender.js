(function () {

	app.factory('fileSender', function(webrtc, model) {
		var fileSender = {
			init: function() {
				webrtc.addMessageHandler(fileHandler, "fileReceiver");
			}
		};

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

		fileSender.sendFile = function() {
			startSending();
		};

		function startSending() {
			if (!model.file.file) {return console.error("no file!!");}

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
					read(file, 1, signalEof);
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
						read(blob, sliceCounter++, signalEof);
					}
					else {
						blob = file.slice(i, i + maxSize);
						read(blob, sliceCounter++, senderLoop(i+maxSize));
					}

				};
			}

			function signalEof() {
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

		}

		var fileCounter = 0;

		function generateRandomFileId() {
			var me = model.userInfo.data.xmpp.jid;
			var userid = me.substring(0,me.indexOf("@"));
			var id = userid + "-" + Math.random().toString(36).substring(7) + "-" + fileCounter++;
			console.log(id);
			return id;
		}


		

		var listOfCallbacks = [];

		function sendFileChunk2(id, chunk, status, slice, totalSlices, number, totalNumber, filename) {
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
			webrtc.sendObject(tempFile, "fileSender");
		}


		var totalOverhead = 0;
		var overHeadCount = 0;
		function sendFileChunk(id, chunk, status, slice, totalSlices, number, totalNumber, filename) {
			var tempFile = {
				id: id,
				size: chunk.length,
				status: status,
				number: number,
				totalNumber: totalNumber,
				filename: filename,
				slice: slice,
				totalSlices: totalSlices
			};


			var string = JSON.stringify(tempFile);

			overHeadCount ++;
			totalOverhead += string.length * 2;
			console.log("Total overhead: " + totalOverhead + " - Average overhead: " + totalOverhead / overHeadCount);
		}

		function signalFile(id, status, totalSlices, filename) {
			var tempFile = {
				id: id,
				status: status,
				filename: filename,
				totalSlices: totalSlices
			};
			webrtc.sendObject(tempFile, "fileSender");
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
			webrtc.sendObject(tempFile, "fileSender");
		}


		return fileSender;
	});

})();
