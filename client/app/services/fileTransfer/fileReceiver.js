(function () {

	app.factory('fileReceiver', function($rootScope, dataSender,  utility, fileList, $window) {
		var fileReceiver = {
			init: function() {
				dataSender.addMessageHandler(fileHandler, "fileSender");
				prepareSandbox();
			}
		};

		var storage = {};

		function cleanUp(id) {
			storage[id].sender.finished();
			delete storage[id];
		}

		function fileHandler(data, from) {

			if (data.status === "sof") {

				storage[data.id] = {};
				storage[data.id].sender = dataSender.getSender(from, "fileReceiver");

				$rootScope.$apply(function() {
					storage[data.id].fileObject = fileList.get(data.id);

					var cancelWatcher = $rootScope.$watch(function() {
						if (storage[data.id]) {
							return storage[data.id].fileObject.cancelled;
						}
					}, function (newValue) {
						if (newValue) {
							signalFile(data.id, "cancel");
							delete storage[data.id];

							cancelWatcher();
						}
					});
				});

				if (fileList.writeFailed) {
					$rootScope.$apply(function() {
						fileList.get(data.id).writeFailed = true;
						fileList.get(data.id).cancel();
					});
					return;
				}

				initiateFileSystem(data.id, data.filename, data.size, data.totalSlices, function() {
						storage[data.id].filename = data.filename;
						storage[data.id].counter = 0;
						storage[data.id].eof = false;
						storage[data.id].totalSlices = data.totalSlices;
						storage[data.id].totalNumbers = [];
						storage[data.id].getTotalNumber = function() {
							var total = 0;
							for (var i = 1; i < this.totalNumbers.length; i++) {
								total += this.totalNumbers[i];
							}
							return total;
						};
						storage[data.id].slices = [];



					signalFile(data.id, "sof_ack", data.totalSlices, data.filename);
				});
				
			}
			else if (storage[data.id]) {
				if (data.status === "sos") {
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
					signalSlice(data.id, "sos_ack", data.slice, data.totalSlices, data.totalNumber, data.filename);
				}
				else if (data.status === "ongoing") {
					if (!storage[data.id].sliceSize) storage[data.id].sliceSize = data.totalNumber;

					if (data.number % 25 === 0) {
						var progress = (storage[data.id].counter / (storage[data.id].totalSlices * storage[data.id].sliceSize)) * 100;

						$rootScope.$apply(function() {
							fileList.list[data.id].progress = progress;
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
					if (storage[data.id].slices) {
						storage[data.id].slices[data.slice].eos = true;
					}
					else {
						console.error("This should not have happened. Deleted data before completing");
						console.log(storage);
						console.log(data);
					}
				}
				else if (data.status === "eof") {
					storage[data.id].eof = true;
				}
				else if (data.status === "cancel") {
					$rootScope.$apply(function() {
						storage[data.id].fileObject.cancel();
						return;
					});
				}
				else {
					console.log("You should not see this. Status: " + data.status);
				}

				if (storage[data.id] && storage[data.id].slices[data.slice] &&
					storage[data.id].slices[data.slice].eos &&
						storage[data.id].slices[data.slice].counter ===
							storage[data.id].slices[data.slice].totalChunks) {


					var byteArraysForCompleteSlice = storage[data.id].slices[data.slice].getByteArray();
					var blob = new Blob(byteArraysForCompleteSlice, {type: "application/octet-stream"});

					delete storage[data.id].slices[data.slice];

					if (data.slice === data.totalSlices) {
						sandbox[data.id].appendBlob(blob, true);
						storage[data.id].receivedEntireFile = true;
					}
					else {
						sandbox[data.id].appendBlob(blob, false);
					}
					signalSlice(data.id, "eos_ack", data.slice, data.totalSlices, data.totalNumber, data.filename);
				}

				if (storage[data.id] && storage[data.id].eof &&
					storage[data.id].counter === storage[data.id].getTotalNumber() &&
						storage[data.id].receivedEntireFile) {

					$rootScope.$apply(function() {
					});
					signalFile(data.id, "eof_ack", data.totalSlices, data.filename);


					cleanUp(data.id);
				}
			}
			else {
			}

		}


		function signalFile(id, status, totalSlices, filename) {
			var tempFile = {
				id: id,
				status: status,
				filename: filename,
				totalSlices: totalSlices
			};
			if (storage[id].sender) {
				storage[id].sender.send(tempFile, true);
			}
			else {
				console.error("no sender");
			}
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
			if (storage[id].sender) {
				storage[id].sender.send(tempFile, true);
			}
			else {
				console.error("no sender");
			}
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


		function prepareSandbox() {
			$window.webkitRequestFileSystem(window.TEMPORARY, 0, onInit, errorHandler);

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
						}, errorHandler);
					}, null); 
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

		function initiateFileSystem(id, filename, fileSize, totalSlices, callback) {
			if (false) {
				navigator.webkitPersistentStorage.requestQuota(fileSize + 1024*10, function(grantedBytes) {
					console.log("granted bytes " + grantedBytes);
					window.webkitRequestFileSystem(window.PERSISTENT, grantedBytes, onInitFs(id, filename, totalSlices, callback), errorHandler);
				}, errorHandler);
			}
			else {
				window.webkitRequestFileSystem(window.TEMPORARY, fileSize, onInitFs(id, filename, totalSlices, callback), errorHandler);
			}
		}

		var sandbox = {
			counter: 0
		};
		function onInitFs(id, filenameInput, totalSlices, callback) {
			return function(fs) {
				var filename = "files/" + filenameInput + "-" + utility.randomString() + "-" + sandbox.counter++;

				continueFileInit(1);

				function continueFileInit(part) {
					if (part === 1) {
						fs.root.getFile(filename, {create: false}, function(fileEntryInput) {
							fileEntryInput.remove(function() {
							}, errorHandler);

							continueFileInit(2);
						}, function() {
							continueFileInit(2);
						});
					}
					if (part === 2) {
						fs.root.getDirectory('files', {create: true}, function(dirEntry) {
							continueFileInit(3);
						}, errorHandler);
					}
					if (part === 3) {
						fs.root.getFile(filename, {create: true}, function(fileEntryInput) {
							continueFileInit(4);
						}, errorHandler);
					}
					if (part === 4) {
						sandbox[id] = {
							appendBlob: function(blob, lastBlob) {
								fs.root.getFile(filename, {create: false}, function(fileEntry) {
									fileEntry.createWriter(function(fileWriter) {
										fileWriter.onwriteend = function(e) {
											if (lastBlob) {

												var watcher = $rootScope.$watch(function() {return fileList.list[id].accepted;}, function(newValue) {
													if (newValue) {
														sandbox[id].downloadFile();
														watcher();
													}
												});

												$rootScope.$apply(function() {
													fileList.list[id].finished = true;
												});
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
										var link = document.createElement('a');
										link.href = window.URL.createObjectURL(file);
										link.download = filenameInput;
										link.click();

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
			fileList.writeFailed = true;
		}

		return fileReceiver;
	});

})();
