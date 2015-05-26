mLoader
==
A little JS library to asynchronous loading of JS and CSS. Based on Promises.

Usage
--
      mLoader.load(<file_list>, <loader_options>);

where `file_list` can be:
1. Remote server url as string (HTTP POST request without parameters),
2. Remote server url as object (HTTP POST request with parameters),
3. Array of file names (predefined list),
4. String row of file names.

Explanation
--
1) `file_list`: '/api/config' or, with parameters,

2) `file_list`: {config_url: '/api/config', config_params: {debug: true, user: 'user1', passwordhash: 'd67c5cbf5b01c9f91932e3b8def5e5f8'}}

There `config_url` is mandatory, `config_params` isn't. If the `file_list` is object, it will be treated as request parameters and config_url has to be present.
	 	
Server in his turn have to return JSON `{files: [..array of filenames..]}` (with mandatory `files` field)	on POST request to the %config_url%. Than this array will be used as list of files to load.

3) `file_list` also can be array with two levels (max) or string of filenames separated by comma or semicolon
	 	[
			'file0',
			'file1',
			[
				'file2',
				'file3',
				'file4'
			],
			'file5',
			[
				 'file6',
			 	'file7'
			]
	 	]
 		
and the loading sequence will be:
 		
    file0, than file1, than (file2, file3, file4) simultaneously, than file5, than (file6, file7) simultaneously

4) In the string format equivalent is

 		mLoader.load('file0; file1; file2, file3, file4; file5; file6, file7');
 		
(semicolon separates sequential file section, comma - parallel)

*Notice:* If <file_list> is string WITHOUT commas and semicolons, it will be treated as config_url. (1)
If <file_list> is string WITH commas and/or semicolons, it will be treated as comma-separated list of files to load. (4)

`loader_options` is, surprisigly, optional object
		
		{
			delay: 2000, // ms, wait 2s before run, default: 0, no delay
			folder: 'files', // prefix for 'file0' -> files/file0.js, default: 'js/'
			polyfill: 'https://www.promisejs.org/polyfills/promise-6.1.0.min.js', // where to get Promise polyfill for IE
			verbose: true, // write console.log infog during the process, default: false
		
			// optional handlers
			start: function(queue, count){ ... }, // queue - prepared array of files to load, count - amount of items in queue
			finish: function(loaded_modules){ ... }, // loaded_modules - list of objects of loaded modules
			progress: function(filename, len){ ... }, // filename - name of loaded file, len - length of ig
			fail: function(err){ ... }	// err - error reason (string)
		}

		"loaded_modules" is array which contains list of objects:
			{
				origin: "", // {string} source of file name
				url: "", // {string} url where to get file
				length: 0, // {number} length of file
				loaded_at: new Date(), // {Date} datetime when file has been loaded
				mode: "" // {string} load mode, "parallel" | "sequenced"
			}


File name that includes path separator (\ or /) will be processed only in extension part: ".js" will be added automatically if it is absent.

File name without path separators will be expanded as %loader_options.folder% + "/" + filename + ".js"

mLoader supports .js (default) and .css files to load.


Examples
--
 
	 1. (HTML) <script src="js/mloader.js" onload="mLoader.load('/api/config', {timeout: 2000});" defer="true"></script>

	 2. mLoader.load(); // error, unknown provider

	 3. mLoader.load('/api/config'); // remote by url, error 403 if password required

	 4. mLoader.load({
			config_url: '/api/config',
			config_params: {
				debug: true,
				name: 'user1',
				password: '1user'
			}
		}); // remote with parameters, all right

	 5. mLoader.load('test0, test1'); // embedded list of files, array [/js/test0.js, /js/test1.js] in the string form

	 6. mLoader.load([
	 	'test0',
	 	'test1', 
	 	[
	 		'test2',
	 		'test3'
	 	],
	 	'testm'
	 ]); // embedded list of files, array

	 7. mLoader.load(
		 	'/api/config', 
		 	{
		 		delay: 1000, 
		 		start: writeStart, 
		 		finish: writeFinish, 
		 		progress: writeProgress, 
		 		fail: sayError
		 	});
	 	
* with delay 1s load filelist from remote server url '/api/config', 
* then call writeStart routine, 
* then load each file and call writeProgress routine after file loading, 
* then call writeFinish, 
* if error - call sayError.
