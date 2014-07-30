(function () {

	app.factory('fileSender', function($rootScope, dataSender, model, utility) {
		var fileSender = {
			init: function() {
				dataSender.addMessageHandler(dataHandlers.main, "fileReceiver");
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
			},
			remove: function(id) {
				if (dataHandlers.list[id]) {
					delete dataHandlers.list[id];
				}
			}
		};


		fileSender.sendFile = function(file, to) {
			sendFile(file,to);
		};
		

		function sendFile (file, to) {

			if (!file || !to) {
				return console.log("wrong input to sendFile");
			}
			var progress = {
				counter: 0,
				calculate: function() {
					if (this.totalSlices && this.sliceSize) {
						return (this.counter / (this.totalSlices * this.sliceSize)) * 100;
					}
					return false;
				}
			};

			console.log("sender 1");
			

			var sender = dataSender.getSender(to, "fileSender", function(status) {
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
				else if (status === "failed") {
					model.file.list[id].failed = true;
				}
			});
			console.log("sender 1");

			var size = file.size;
			var maxSize = 100*1024*1024;
			var totalSlices = Math.ceil(size / maxSize);
			var id = generateRandomFileId();
			
			progress.totalSlices = totalSlices;
			var fileObject = model.file.add(id, file.name, to, true, size);

			function isCancelled() {
				return fileObject.cancelled;
			}

			console.log("sender 1");
			var watcher = $rootScope.$watch(function() {return fileObject.cancelled;}, function (newValue) {
				if (newValue) {
					signalCancel(id);
	
					watcher();
				}
			});

			console.log("sender 1");
			dataHandlers.add(fileHandler, id);
			var listOfCallbacks = [];

			function fileHandler(data) {
				if (data.status === "sof_ack") {
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
						model.file.list[id].finished = true;
					});
					dataHandlers.remove(id);
				}
				else if (data.status === "cancel") {
					fileObject.cancel();
				}
			}
			console.log("sender 1");

			signalFile(id, "sof", totalSlices, file.name, size);

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
			console.log("sender 1");
					if (isCancelled()) {
						return;
					}

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
			console.log("sender 1");

			function eof() {
				signalFile(id, "eof", totalSlices, file.name);
	
			}

			console.log("sender 1");
			function read(blob, slice, callback) {
			console.log("sender 1");
				var reader = new FileReader();

				reader.onerror = function(event) {
					console.error("File could not be read! Code " + event.target.error.code);
				};

				reader.onload = function(event) {
			console.log("sender 1");
					var buffer = event.target.result;

					var array = btoa(buffer).match(/.{1,51200}/g);
					if (!progress.sliceSize) progress.sliceSize = array.length;

					signalSlice(id, "sos", slice, totalSlices, array.length, file.name);

					listOfCallbacks[slice] = function() {
						for (var i in array) {
							if (isCancelled()) {
								return;
							}

							sendFileChunk(id, array[i], "ongoing", slice, totalSlices, i, array.length, file.name);
						}
						signalSlice(id, "eos", slice, totalSlices, array.length, file.name);
						if (callback) callback();
					};
				};
				reader.readAsBinaryString(blob);
			}

			console.log("sender 1");

			function sendFileChunk(id, chunk, status, slice, totalSlices, number, totalNumber, filename) {
			console.log("signal file 1");
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

			function signalCancel(id) {
				sender.send({
					id: id,
					status: "cancel",
				}, true);
			}

			function signalFile(id, status, totalSlices, filename, size) {
			console.log("signal file 1");
				var tempFile = {
					id: id,
					status: status,
					filename: filename,
					totalSlices: totalSlices,
					size: size
				};
			console.log("signal file 2");
				sender.send(tempFile);
			console.log("signal file 3");
			}

			function signalSlice(id, status, slice, totalSlices, totalNumber, filename) {
			console.log("signal file 1");
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
			console.log("sender 1");
		}

		var fileCounter = 0;

		function generateRandomFileId() {
			var me = model.user.info.xmpp.jid;
			var userid = me.substring(0,me.indexOf("@"));
			var id = userid + "-" + utility.randomString() + "-" + fileCounter++;
			return id;
		}

		return fileSender;
	});

})();
