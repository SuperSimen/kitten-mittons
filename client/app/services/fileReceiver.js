(function () {

	app.factory('fileReceiver', function(webrtc) {
		var fileReceiver = {
			init: function() {
				webrtc.addMessageHandler(fileHandler, "fileSender");
				prepareSandbox();
			}
		};

		//Don't use filename as id. not unique
		var storage = {};

		function cleanUp(filename) {
			storage[filename] = {};
		}
		function fileHandler(data) {
			if (data.number % 50 === 0) {
				console.log("incoming data: " + data.status + ", number: " + data.number);
			}
			
			if (data.status === "sof") {
				console.log(data);
				initiateFileSystem(data.filename, data.size, data.totalSlices, function() {
					storage[data.filename] = {
						filename: data.filename,
						counter: 0,
						eof: false,
						totalSlices: data.totalSlices,
						totalNumbers: [],
						getTotalNumber: function() {
							var total = 0;
							for (var i = 1; i < this.totalNumbers.length; i++) {
								total += this.totalNumbers[i];
							}
							return total;
						},
						slices: []
					};
					console.log("starting file transfer. Total number of slices: " + data.totalSlices);
					signalFile("fileAck", data.totalSlices, data.filename);
				});
			}
			else if (data.status === "sos") {
				console.log("starting slice " + data.slice + ". Total chunks: " + data.totalNumber);
				storage[data.filename].slices[data.slice] = {
					totalChunks: data.totalNumber,
					counter: 0,
					eos: false,
					chunks: [],
					getByteArray: function() {
						var byteArrays = [];
						for (var i in this.chunks) {
							for (var j in this.chunks[i]) {
								var temp = this.chunks[i][j];
								if (!temp) {
									return console.error("Panic! missing chunk");
								}
								byteArrays.push(this.chunks[i][j]);
							}
						}
						return byteArrays;
					}
				};

				storage[data.filename].totalNumbers[data.slice] = data.totalNumber;
				signalSlice("sliceAck", data.slice, data.totalSlices, data.totalNumber, data.filename);
			}
			else if (data.status === "ongoing") {
				storage[data.filename].counter++;
				storage[data.filename].slices[data.slice].counter++;
				var byteArrays = base64toByteArrays(data.base64);

				if (storage[data.filename].slices[data.slice].chunks[data.number]) {
					console.error("same chunk twice");
				}
				storage[data.filename].slices[data.slice].chunks[data.number] = byteArrays;
			}
			else if (data.status === "eos") {
				storage[data.filename].slices[data.slice].eos = true;
			}
			else if (data.status === "eof") {
				storage[data.filename].eof = true;
				console.log("File finished, max sender queue length : " + data.queueMaxLength);
				//storage[data.filename].totalNumber = totalNumber;
			}
			else {
				console.log("You should not see this. Status: " + data.status);
			}

			if (storage[data.filename] && storage[data.filename].slices[data.slice] &&
				storage[data.filename].slices[data.slice].eos &&
				storage[data.filename].slices[data.slice].counter ===
				storage[data.filename].slices[data.slice].totalChunks) {

				console.log("finished slice");

				var byteArraysForCompleteSlice = storage[data.filename].slices[data.slice].getByteArray();
				var blob = new Blob(byteArraysForCompleteSlice, {type: "application/octet-stream"});

				delete storage[data.filename].slices[data.slice];

				if (data.slice === data.totalSlices) {
					sandbox.appendBlob(blob, true);
				}
				else {
					sandbox.appendBlob(blob, false);
				}
			}

			if (storage[data.filename] && storage[data.filename].eof &&
				storage[data.filename].counter === storage[data.filename].getTotalNumber()) {

				cleanUp(data.filename);
			}
		}

		function signalFile(status, totalSlices, filename) {
			var tempFile = {
				status: status,
				filename: filename,
				totalSlices: totalSlices
			};
			webrtc.sendObject(tempFile, "fileReceiver");
		}

		function signalSlice(status, slice, totalSlices, totalNumber, filename) {
			var tempFile = {
				slice: slice,
				status: status,
				totalNumber: totalNumber,
				totalSlices: totalSlices,
				filename: filename
			};
			webrtc.sendObject(tempFile, "fileReceiver");
		}


		function base64toByteArrays(b64Data) {
			var sliceSize = 512;

			var byteCharacters = atob(b64Data);
			var byteArrays = [];

			for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
				var slice = byteCharacters.slice(offset, offset + sliceSize);

				var byteNumbers = new Array(slice.length);
				for (var i = 0; i < slice.length; i++) {
					byteNumbers[i] = slice.charCodeAt(i);
				}

				var byteArray = new Uint8Array(byteNumbers);

				byteArrays.push(byteArray);
			}
			return byteArrays;
		}

		function initiateFileSystem(filename, fileSize, totalSlices, callback) {
			window.webkitRequestFileSystem(window.TEMPORARY, 1024, onInitFs(filename, totalSlices, callback), errorHandler);
		}

		function prepareSandbox() {
			window.webkitRequestFileSystem(window.TEMPORARY, 0, onInit, errorHandler);

			function onInit(fs) {
				function readEntries () {
					var dirReader = fs.root.createReader();
					dirReader.readEntries (function(results) {
						for (var i in results) {
							results[i].remove(null, errorHandler);
						}
						console.log(results);
					}, errorHandler);
				}

				function deleteDirectory(directory) {
					fs.root.getDirectory(directory, {}, function(dirEntry) {
						dirEntry.removeRecursively(function() {
							console.log("Removed directory");
						}, errorHandler);
					}, errorHandler); 
				}

				deleteDirectory("files");
			}
		}

		var sandbox;
		function onInitFs(filenameInput, totalSlices, callback) {
			return function(fs) {
				console.log('Opened file system: ' + fs.name);
				var filename = "files/" + filenameInput;

				continueFileInit(1);

				function continueFileInit(part) {
					if (part === 1) {
						console.log("Part 1");
						fs.root.getFile(filename, {create: false}, function(fileEntryInput) {
							fileEntryInput.remove(function() {
								console.log("deleting file");
							}, errorHandler);

							continueFileInit(2);
						}, function() {
							continueFileInit(2);
						});
					}
					if (part === 2) {
						console.log("Part 2");
						fs.root.getDirectory('files', {create: true}, function(dirEntry) {
							console.log("directory created");
							continueFileInit(3);
						}, errorHandler);
					}
					if (part === 3) {
						console.log("Part 3");
						fs.root.getFile(filename, {create: true}, function(fileEntryInput) {
							console.log("file opend");
							console.log(fileEntryInput);
							continueFileInit(4);
						}, errorHandler);
					}
					if (part === 4) {
						console.log("Part 4");
						sandbox = {
							appendBlob: function(blob, lastBlob) {
								fs.root.getFile(filename, {create: false}, function(fileEntry) {
									fileEntry.createWriter(function(fileWriter) {
										fileWriter.onwriteend = function(e) {
											console.log('Write completed.');
											if (lastBlob) {
												sandbox.downloadFile();
											}
										};
										fileWriter.onerror = function(e) {
											console.log('Write failed: ' + e.toString());
										};
										fileWriter.seek(fileWriter.length);
										fileWriter.write(blob);

									}, errorHandler);
								}, errorHandler);
							},
							downloadFile: function() {
								fs.root.getFile(filename, {create: false}, function(fileEntry) {
									fileEntry.file(function(file) {
										console.log("saving file");
										var link = document.createElement('a');
										link.href = window.URL.createObjectURL(file);
										link.download = file.name;
										link.click();
										console.log("finished saving file");

									}, errorHandler);
								});
							},
							readFile: function() {
								fs.root.getFile(filename, {create: false}, function(fileEntry) {
									fileEntry.file(function(file) {
										var reader = new FileReader();
										reader.onloadend = function(e) {
											console.log(this.result);
										};
										reader.readAsText(file);
									}, errorHandler);
								});
							},

						};
						callback();
					}
				}
			};
		}

		function errorHandler(e) {
			console.error(e);
		}

		return fileReceiver;
	});

})();
