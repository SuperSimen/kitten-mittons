(function () {

	app.factory('fileReceiver', function($rootScope, webrtc, model) {
		var fileReceiver = {
			init: function() {
				webrtc.addMessageHandler(fileHandler, "fileSender");
				prepareSandbox();
			}
		};

		var storage = {};

		function cleanUp(id) {
			storage[id] = {};
		}
		var prevValue = 0;
		function fileHandler(data, from) {
			if (data.number % 50 === 0) {
				console.log("incoming data: " + data.status + ", number: " + data.number);
			}
			
			if (data.status === "sof") {
				$rootScope.$apply(function() {
					model.file.add(data.id, data.filename, from, false);
				});

				console.log(data);
				initiateFileSystem(data.id, data.filename, data.size, data.totalSlices, function() {
					if (storage[data.id]) {
						return console.error("data.id is not unique. aborting...");
					}
					storage[data.id] = {
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
					signalFile(from, data.id, "sof_ack", data.totalSlices, data.filename);
				});
			}
			else if (data.status === "sos") {
				console.log("starting slice " + data.slice + ". Total chunks: " + data.totalNumber);
				storage[data.id].slices[data.slice] = {
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

				storage[data.id].totalNumbers[data.slice] = data.totalNumber;
				signalSlice(from, data.id, "sos_ack", data.slice, data.totalSlices, data.totalNumber, data.filename);
			}
			else if (data.status === "ongoing") {
				if (!storage[data.id].sliceSize) storage[data.id].sliceSize = data.totalNumber;

				if (data.number % 25 === 0) {
					var progress = (storage[data.id].counter / (storage[data.id].totalSlices * storage[data.id].sliceSize)) * 100;

					$rootScope.$apply(function() {
						model.file.list[data.id].progress = progress;
					});
				}

				storage[data.id].counter++;
				storage[data.id].slices[data.slice].counter++;
				var byteArrays = base64toByteArrays(data.base64);

				if (storage[data.id].slices[data.slice].chunks[data.number]) {
					console.error("same chunk twice");
				}
				storage[data.id].slices[data.slice].chunks[data.number] = byteArrays;
			}
			else if (data.status === "eos") {
				storage[data.id].slices[data.slice].eos = true;
			}
			else if (data.status === "eof") {
				storage[data.id].eof = true;
			}
			else {
				console.log("You should not see this. Status: " + data.status);
			}

			if (storage[data.id] && storage[data.id].slices[data.slice] &&
				storage[data.id].slices[data.slice].eos &&
				storage[data.id].slices[data.slice].counter ===
				storage[data.id].slices[data.slice].totalChunks) {

				console.log("finished slice");

				var byteArraysForCompleteSlice = storage[data.id].slices[data.slice].getByteArray();
				var blob = new Blob(byteArraysForCompleteSlice, {type: "application/octet-stream"});

				delete storage[data.id].slices[data.slice];

				if (data.slice === data.totalSlices) {
					sandbox[data.id].appendBlob(blob, true);
				}
				else {
					sandbox[data.id].appendBlob(blob, false);
				}
				signalSlice(from, data.id, "eos_ack", data.slice, data.totalSlices, data.totalNumber, data.filename);
			}

			if (storage[data.id] && storage[data.id].eof &&
				storage[data.id].counter === storage[data.id].getTotalNumber()) {

				cleanUp(data.id);
				$rootScope.$apply(function() {
					model.file.remove(data.id);
				});
				signalFile(from, data.id, "eof_ack", data.totalSlices, data.filename);
			}
		}

		function signalFile(to, id, status, totalSlices, filename) {
			console.log("signalling file to " + to);
			var tempFile = {
				id: id,
				status: status,
				filename: filename,
				totalSlices: totalSlices
			};
			webrtc.sendObject(tempFile, to, "fileReceiver", true);
		}

		function signalSlice(to, id, status, slice, totalSlices, totalNumber, filename) {
			console.log("signalling slice to " + to);
			var tempFile = {
				id: id,
				slice: slice,
				status: status,
				totalNumber: totalNumber,
				totalSlices: totalSlices,
				filename: filename
			};
			webrtc.sendObject(tempFile, to, "fileReceiver", true);
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

		function initiateFileSystem(id, filename, fileSize, totalSlices, callback) {
			window.webkitRequestFileSystem(window.TEMPORARY, 1024, onInitFs(id, filename, totalSlices, callback), errorHandler);
		}

		function prepareSandbox() {
			window.webkitRequestFileSystem(window.TEMPORARY, 0, onInit, errorHandler);

			function onInit(fs) {
				function readEntries () {
					var dirReader = fs.root.createReader();
					dirReader.readEntries (function(results) {
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

				function readDirectory(directory) {
					fs.root.getDirectory(directory, {}, function(dirEntry) {
						var dirReader = dirEntry.createReader();
						dirReader.readEntries(function(results) {
							console.log(results);
						}, errorHandler);
					}, errorHandler); 
				}
				deleteDirectory("files");
			}
		}

		var sandbox = {
			counter: 0
		};
		function onInitFs(id, filenameInput, totalSlices, callback) {
			return function(fs) {
				console.log('Opened file system: ' + fs.name);
				var filename = "files/" + filenameInput + "-" + Math.random().toString(32).substring(2) + "-" + sandbox.counter++;

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
						sandbox[id] = {
							appendBlob: function(blob, lastBlob) {
								fs.root.getFile(filename, {create: false}, function(fileEntry) {
									fileEntry.createWriter(function(fileWriter) {
										fileWriter.onwriteend = function(e) {
											console.log('Write completed.');
											if (lastBlob) {
												sandbox[id].downloadFile();
											}
										};
										fileWriter.onerror = function(e) {
											console.log('Write failed: ' + e.toString());
											console.error(e);
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
										link.download = filenameInput;
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
