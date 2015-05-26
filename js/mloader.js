/***
 mLoader | JS Mini Loader
 (c) lexey111, 2015
 */

var mLoader;

if (mLoader && mLoader.load && typeof mLoader.load === 'function') {
	// detect secondary attachment
	console.warn('JS mLoader module has been already attached. Please do not include it twice.');
} else {
	// create mLoader object
	mLoader = (function mLoader() {
		'use strict';
		// cache for document's header
		var head = document.getElementsByTagName('HEAD').item(0);
		// ---------------------------------------------------------------------------------------------------
		// LOGGING
		// ---------------------------------------------------------------------------------------------------
		var Log = function (verbose) {
			this.verbose = verbose;
		};

		Log.prototype = {
			/**
			 * Log warnings to console
			 */
			warning: function () {
				console.warn.apply(console, arguments);
			},

			/**
			 * Wrapper for log
			 */
			write: function () {
				if (!this.verbose) {
					return;
				}
				console.log.apply(console, arguments);
			},

			/**
			 * Wrapper for error messages
			 */
			error: function () {
				console.error.apply(console, arguments);
			}
		};

		// ---------------------------------------------------------------------------------------------------
		// Utils
		// ---------------------------------------------------------------------------------------------------
		var path = {
			/**
			 * Resolve file extension (last .ext)
			 * @param  {string} filename filename
			 * @return {string} extension if any, without leading "."
			 */
			getFileExt: function (filename) {
				if (!filename || typeof filename !== 'string' || filename.length < 2) {
					return '';
				}
				var ext = /(?:\.([^.]+))?$/.exec(filename)[1] || '';
				var get_index = ext.indexOf('?');
				if (get_index !== -1) {
					ext = ext.substr(0, get_index);
				}
				return ext;
			},

			/**
			 * Resolve file extension (last .ext)
			 * @param  {string} filename filename
			 * @return {string} extension if any, without leading "."
			 */
			getGetParams: function (filename) {
				if (!filename || typeof filename !== 'string' || filename.length < 2) {
					return '';
				}
				return /(?:\?([^.]+))?$/.exec(filename)[1] || '';
			},

			/**
			 * Return filename (with extension) from full path
			 * @return {string} filename
			 * @param path
			 */
			getFileName: function (path) {
				var p = path.replace(/^.*(\\|\/|\:)/, '');
				if (p && p.length && p[0] == '.') {
					p = '';
				}
				var get_index = p.indexOf('?');
				if (get_index !== -1) {
					p = p.substr(0, get_index);
				}

				return p;
			},

			/**
			 * Return filename (with extension) from full path
			 * @return {string} filename
			 * @param filename
			 */
			getFileNameWOExt: function (filename) {
				var name = this.getFileName(filename); // extract name
				var ext = this.getFileExt(name); // extract extension

				if (!ext) {
					return name;
				}

				return name.substr(0, name.length - ext.length - 1);
			},

			/**
			 * Extract path part from full file name
			 * @return {string} path if any w/o filename
			 * @param path
			 */
			getFilePath: function (path) {
				if (!path || typeof path !== 'string' || !path.length) {
					return '';
				}

				var p = /^.*(\\|\/|\:)/.exec(path);

				return p && p.length ? p[0] || '' : '';
			},

			/**
			 * Decode type by extension
			 * @param  {string} ext
			 * @return {string}
			 */
			_decodeFileTypeByExt: function (ext) {
				var s = ext.toLowerCase();
				if (s == 'js') {
					return 'script';
				}

				if (s == 'css') {
					return 'css';
				}

				return void 0;
			},

			/**
			 * Decode "name" to "js/name.js" and fill path structure
			 * {
			 *		origin: name, // original name, angular
			 *		filename: '', // file name with extension, angular.js
			 *		name: '', // file name without extension, angular
			 *		ext: '', // file extension, js
			 *		type: '', // decoded file type (script|css), script
			 *		path: '', // full path to file, /js/libs/
			 *      get_params: '', // get params, '?version=1cache=false'
			 *		url: '' // The result, /js/libs/angular.js
			 * }
			 */
			getScriptURL: function (name, folder_prefix) {
				var result = {
					origin: name, // original name
					filename: '', // file name with extension
					name: '', // file name withou extension
					ext: '', // file extension
					type: '', // decoded file type (script|css)
					path: '', // full path to file
					get_params: '', // get
					url: '' // The result
				};
				result.get_params = this.getGetParams(name); // GET uri

				result.ext = this.getFileExt(name); // file extension
				if (!result.ext) {
					result.ext = 'js'; // file extension
					name += '.' + result.ext; // default file type
				}

				result.filename = this.getFileName(name); // file name with extension
				result.name = this.getFileNameWOExt(name); // file name without extension
				result.path = this.getFilePath(name); // path
				result.type = this._decodeFileTypeByExt(result.ext); // script|css

				if (!result.type) {
					throw new Error('Can\'t resolve file type for ' + name);
				}

				if (!result.path) {
					result.path = folder_prefix;
				}

				result.url = result.path + result.filename;
				if (result.get_params) {
					result.url += '?' + result.get_params;
				}
				return result;
			}
		};

		/**
		 * Concat two objects
		 * @param  {Object} obj1
		 * @param  {Object} obj2
		 * @return {Object}
		 */
		function extend(obj1, obj2) {
			for (var p in obj2) {
				try {
					// Property in destination object set; update its value.
					if (obj2[p].constructor == Object) {
						obj1[p] = extend(obj1[p], obj2[p]);
					} else {
						obj1[p] = obj2[p];
					}
				} catch (e) {
					// Property in destination object not set; create it and set its value.
					obj1[p] = obj2[p];
				}
			}
			return obj1;
		}

		/**
		 * Wrapper for promise management
		 */
		function Defer() {
			var result = {};
			result.promise = new Promise(function (resolve, reject) {
				result.resolve = resolve;
				result.reject = reject;
			});
			return result;
		}

		/**
		 * Detect object type
		 */
		function isArray(obj) {
			return (typeof obj === 'object' && obj.sort && typeof obj.sort === 'function');
		}

		function isString(obj) {
			return (typeof obj === 'string');
		}

		function isObject(obj) {
			return (typeof obj === 'object' && !(isArray(obj)));
		}

		/**
		 * Make promise with optional delay
		 * @param  {Number} delay in ms
		 */
		function delayedPromise(delay) {
			return new Promise(function (resolve) {
				if (!delay) {
					return resolve();
				}

				setTimeout(function () {
					resolve();
				}, delay);
			});
		}

		/**
		 * Parse string and makes it array of files in appropriate format
		 * @param  {string} str
		 * @return {Array}
		 */
		function stringToArray(str) {
			if (!str) return [];

			var result = [];
			var tmp = str.replace(/\s/g, '').replace(/,,/g, ',').replace(/;;/g, ';').split(';');

			tmp.every(function (item) {
				if (!item) {
					return true; // skip empty items
				}

				if (item.indexOf(',') === -1) {
					result.push(item);
				} else {
					var tmp_2 = item.split(',');
					var p_tasks = [];
					tmp_2.every(function (parallel_item) {
						if (parallel_item) {
							p_tasks.push(parallel_item);
						}
						return true;
					});
					if (p_tasks.length) {
						result.push(p_tasks);
					}
				}
				return true;
			});

			return result;
		}

		// ---------------------------------------------------------------------------------------------------
		// files loading
		// ---------------------------------------------------------------------------------------------------

		/**
		 * Load script with XMLHttpRequest
		 * @param  {JSON} file_list_origin
		 */
		function _loadRemoteData(file_list_origin) {
			var deferred = new Defer();
			var req = new XMLHttpRequest();
			var data;


			// Set request headers if provided.
			Object.keys(file_list_origin.headers || {}).forEach(function (key) {
				req.setRequestHeader(key, file_list_origin.headers[key]);
			});

			if (file_list_origin.data && typeof file_list_origin.data == 'object') {
				req.setRequestHeader('Content-type', 'application/json');
				data = JSON.stringify(file_list_origin.data);
			}

			req.onreadystatechange = function (e) {
				if (req.readyState !== 4) {
					return;
				}

				if ([200, 304].indexOf(req.status) === -1) {
					deferred.reject(new Error('Server responded with a status of [' + req.status + '] ' +
						'during loading ' + (req.responseURL || file_list_origin.url)));
				} else {
					// req.responseText - for IE9
					deferred.resolve(req.response ? req.response : req.responseText);
				}
			};

			req.open(file_list_origin.method || 'GET', file_list_origin.url, true);
			req.send(data);

			return deferred.promise;
		}

		/**
		 * Includes script text into page
		 */
		function _includeScript(text, file) {
			var script_element;

			if (file.type == 'script') {
				script_element = document.createElement('script');
				script_element.language = 'javascript';
				script_element.type = 'text/javascript';
				script_element.defer = true;
				script_element.text = text;
				script_element.setAttribute("data-origin", file.url);

				head.appendChild(script_element);

				return;
			}

			if (file.type == 'css') {
				script_element = document.createElement("style");
				script_element.setAttribute("rel", "stylesheet");
				script_element.setAttribute("type", "text/css");
				script_element.innerHTML = text;
				script_element.setAttribute("data-origin", file.url);

				head.appendChild(script_element);

				return;
			}

			throw new Error('Invalid content type!');
		}


		// ---------------------------------------------------------------------------------------------------
		// Configuration code
		// ---------------------------------------------------------------------------------------------------
		/**
		 * Load config from server
		 */
		function _getRemoteConfig(file_list_origin) {
			var config_url;

			// if option is string - treat it as config_url
			config_url = isString(file_list_origin) ?
				file_list_origin :
				isObject(file_list_origin) ? file_list_origin.config_url : void 0;

			if (!config_url) {
				throw new Error('Please set [config_url] parameter');
			}

			return _loadRemoteData({
				method: 'POST',
				url: config_url,
				data: file_list_origin.config_params || void 0
			})
				.then(function (data) {
					if (!data) {
						return Promise.reject('No config data available!');
					}
					var response;

					try {
						response = JSON.parse(data);
						// if object - check the files field
						if (isObject(response)) {
							if (!response || !response.files) {
								return Promise.reject('Invalid response: no [files] field returned!');
							}

							return response.files;
						}

						// if array or string - return as is
						return response;
					} catch (e) {
						return Promise.reject('Bad config format: ' + e.message);
					}

				});
		}

		/**
		 * Process local config (array)
		 */
		function _getLocalConfig(files) {
			return Promise.resolve(files);
		}

		/**
		 * Check Promise support and attach polyfill if it required
		 * @param  {Function} loader function to call when polyfill is ready
		 */
		function _checkPromisesAndRun(loader) {
			if (typeof Promise !== 'undefined') {
				loader.start();
				return;
			}

			loader.log.write('Loading Promise polyfill ' + loader.config.promise_polyfill + '...');

			// include to page
			var script_element = document.createElement('script');

			script_element.language = 'javascript';
			script_element.type = 'text/javascript';
			script_element.defer = true;

			script_element.onerror = function () {
				throw new Error('Cannot load Promise support library!');
			};

			script_element.onload = function () {
				loader.log.write('Promise support library loaded.');

				if (typeof Promise === 'undefined') {
					throw new Error('No Promise support available! Please set up valid [polyfill] library.');
				}

				loader.start();
			};

			// let's load polyfill!
			script_element.src = path.getScriptURL(loader.config.promise_polyfill, loader.config.folder_prefix).url;
			head.appendChild(script_element);
		}


		function iterateArray(arr, payload) {
			if (typeof(arr) == "object") {
				for (var i = 0; i < arr.length; i++) {
					iterateArray(arr[i], payload);
				}
			} else {
				payload(arr);
			}
		}

		// ---------------------------------------------------------------------------------------------------
		// Application code
		// ---------------------------------------------------------------------------------------------------

		/**
		 * Loader instance
		 * @param file_list
		 * @param loader_options
		 */
		var Loader = function (file_list, loader_options) {
			// external settings
			this.config = extend({
				verbose: false,
				start_delay: 0,
				folder_prefix: 'js/',
				promise_polyfill: 'https://www.promisejs.org/polyfills/promise-6.1.0.min.js', // https://www.promisejs.org, https://www.promisejs.org/polyfills/promise-6.1.0.min.js
				onStart: void 0,
				onProgress: void 0,
				onFinish: void 0,
				onFail: void 0
			}, this._parseConfig(file_list, loader_options));

			// internal state
			this.state = {
				status: 'ready',
				file_list: void 0, // file list origin
				queue: [], // queued modules
				modules: [] // successfully loaded modules
			};

			this._fatal_error = false;
			this._error_message = '';
			this.log = new Log(this.config.verbose);
		};

		Loader.prototype = {
			/**
			 * Parsing config values
			 */
			_parseConfig: function (file_list, loader_options) {
				// initial list of files
				var result = {};
				result.file_list = file_list || {};

				// file_list_origin
				if (!loader_options || !isObject(loader_options)) {
					return result;
				}

				if (typeof loader_options.verbose !== 'undefined') {
					result.verbose = !!loader_options.verbose;
				}

				if (loader_options.delay) {
					result.start_delay = parseInt(loader_options.delay) || 0;
				}

				if (loader_options.folder) {
					result.folder_prefix = loader_options.folder || 'js/';

					if (result.folder_prefix.indexOf('/') === -1 && result.folder_prefix.indexOf('\\') === -1) {
						result.folder_prefix += '/';
					}
				}

				if (loader_options.polyfill) {
					result.promise_polyfill = loader_options.polyfill;
				}

				// callbacks
				if (loader_options.start && typeof loader_options.start === 'function') {
					result.onStart = loader_options.start;
				}

				if (loader_options.progress && typeof loader_options.progress === 'function') {
					result.onProgress = loader_options.progress;
				}

				if (loader_options.finish && typeof loader_options.finish === 'function') {
					result.onFinish = loader_options.finish;
				}

				if (loader_options.fail && typeof loader_options.fail === 'function') {
					result.onFail = loader_options.fail;
				}

				return result;
			},
			/**
			 * Set the current state and write it to console
			 * @param {string} state
			 */
			setState: function (state) {
				this.state.status = state;
				this.log.write('[mL] Set mLoader state [%s]', state);
			},
			/**
			 * Set error state
			 * @param {object} err Error
			 */
			_setFatalError: function (err) {
				this.setState('error');
				var s = '';

				if (err) {
					if (isString(err)) {
						s = err;
					} else {
						if (err.message) {
							s = err.message;
						} else {
							s = 'unknown error';
						}
					}
					this.log.error(err);
				}

				if (s) {
					this._error_message = s;
				}
				this._fatal_error = true;
			},

			/**
			 * Load script and include it to page
			 */
			_loadQueuedFile: function (name, mode) {
				if (this._fatal_error) {
					return;
				}
				if (!isString(name)) {
					throw new Error('Bad file name type (not a string): ' + name.toString());
				}

				var file = path.getScriptURL(name, this.config.folder_prefix);

				if (!file.url) {
					throw new Error('Bad file URL for ' + name.toString());
					//throw new Error('Bad file URL!');
				}

				if (this.state.queue[file.url]) {
					this.log.warning('[mL] File is already requested: ' + file.url);
					return; // file is already queued
				}

				this.state.queue[file.url] = file;
				this.state.queue[file.url].state = 'pending';

				this.log.write('[mL] Queued', name, file.url);
				var loader = this;

				return _loadRemoteData({
					url: file.url
				})
					.then(function (data) {
						// attach to page
						if (!loader._fatal_error) {
							_includeScript(data, file);
							loader.log.write('[mL] File attached', file.url);

							if (loader.config.onProgress) {
								loader.config.onProgress(file.url, data.length);
							}

							return data;
						}
					})
					.then(
					function (data) {
						// save statistics
						loader.state.modules.push({
							origin: name,
							url: file.url,
							length: data ? data.length : 0,
							loaded_at: new Date(),
							mode: mode
						});
						return data;
					},
					function (err) {
						loader._setFatalError(err.message);
						return Promise.reject(err);
					});
			},
			/**
			 * Detect remote server call
			 * @param value
			 * @returns {*|boolean}
			 * @private
			 */
			_isRemoteAPIAddr: function (value) {
				return ((isString(value) && value.indexOf(';') === -1) && value.indexOf(',') === -1) || isObject(value);
			},

			/**
			 * Load config from remote or local structure depends on file_list_origin
			 */
			_loadFileList: function () {
				var file_list_loader;
				var file_list_origin = this.config.file_list;

				if (this._isRemoteAPIAddr(file_list_origin)) {
					// load from server
					file_list_loader = _getRemoteConfig(file_list_origin);
				} else {
					// check local
					if (isString(file_list_origin)) {
						file_list_origin = stringToArray(file_list_origin);
					}
					if (file_list_origin.length) {
						file_list_loader = _getLocalConfig(file_list_origin);
					}
				}

				if (!file_list_loader) {
					throw new Error('Loader can\'t resolve config provider.');
				}

				var loader = this;

				return file_list_loader.then(
					function (data) {
						loader.setState('processing');
						if (isString(data)) {
							data = stringToArray(data);
						}

						loader.log.write('Config ready:', data);

						if (loader.config.onStart) {
							var cnt = 0;
							iterateArray(data, function () {
								cnt++;
							});

							loader.config.onStart(data, cnt);
						}

						return data;
					},
					function (err) {
						loader.log.error(err);
						loader._setFatalError('Fatal error during processing the config');

						return Promise.reject(err);
					});
			},
			/**
			 * Construct loading queue
			 * @param data
			 * @returns {Promise}
			 * @private
			 */
			_constructQueue: function (data) {
				var loader = this;
				return new Promise(function (resolve, reject) {
					var q = new Defer();
					var qp = q.promise;
					qp.then(function (data) {
						data.every(function (file) {
							if (isString(file)) {
								// add single file to the end of queue
								qp = qp.then(function () {
									return loader._loadQueuedFile(file, 'sequenced');
								});
							} else {
								if (isArray(file)) {
									// make new promises for the whole array
									qp = qp.then(function () {
										return Promise.all(file.map(function (parallel_file) {
											return loader._loadQueuedFile(parallel_file, 'parallel');
										}));
									});
								}
							}
							return true;
						});

						qp = qp
							.then(function () {
								loader._done();
							}).catch(function (err) {
								return reject(err)
							});
					});

					q.resolve(data);
				});
			},
			/**
			 * Finalize queue
			 * @private
			 */
			_done: function () {
				this.setState('done');

				if (this.config.onFinish) {
					this.config.onFinish(this.state.modules);
				}
			},

			/**
			 * Make chain and run
			 */
			start: function () {
				if (this.state.status !== 'ready') {
					this.log.warning('[mL] Loader is already in state [' + this.state.status + ']');
					return;
				}
				this.log.write('[mL] Verbose "%s"', this.config.verbose);
				this.log.write('[mL] Starting delay', this.config.start_delay);
				this.log.write('[mL] Folder prefix "%s"', this.config.folder_prefix);
				this.log.write('[mL] Promise polyfill URL "%s"', this.config.promise_polyfill);

				this.setState('prepare');
				var loader = this;

				delayedPromise(this.config.start_delay)
					.then(function () {
						return loader._loadFileList().then(function (data) {
							return loader._constructQueue(data);
						});
					})
					.catch(function (err) {
						var message = err.message ? err.message : err;
						loader._setFatalError(message);
						if (loader.config.onFail) {
							loader.config.onFail(message);
						}
					});
			}
		};

		/**
		 * Entry point
		 */
		function _getLoader(file_list, loader_options) {
			// make loader
			var loader = new Loader(file_list, loader_options);

			// check Promise support and start loader
			_checkPromisesAndRun(loader);
		}

		return {
			load: _getLoader
		};
	})();
}