var fs = require("fs");
var path = require('path');
var Q = require('q');
var stat = Q.denodeify( fs.stat.bind(fs) );
var readdir = Q.denodeify( fs.readdir.bind(fs) );
var mime = require('mime');
var hash = require('string-hash');

var sortType = require('./options/sortType');

var createDirectoryObject = function( base, rootDir, fileName, options ){

	var deferred = Q.defer();

	// Set option defaults
	options = typeof options === "object" ? options : {};
	options.sortType = typeof options.sortType !== "undefined" ? options.sortType : true;

	var currentDir = path.normalize( rootDir + '/' + fileName );
	console.log(rootDir, currentDir)
	var fileInfo = {
		id: hash(base, path.relative( "./" + rootDir, "./" + currentDir ) ),
		parent: path.relative( rootDir, path.dirname( currentDir ) ),
		path: path.relative( "./" + rootDir, "./" + currentDir ),
		name: path.basename( currentDir ),
		mime: mime.lookup(mime.lookup(path.relative( "./" + rootDir, "./" + currentDir )))
	};

	console.log(base, path.relative( "./" + rootDir, "./" + currentDir ))

	stat( currentDir )
	.then( function( stats ){

		// Check if file or directory
		fileInfo.type = stats.isFile() ? "file" : "directory";

		if( fileInfo.type === "file" ){
			deferred.resolve( fileInfo );
			throw new Error("Not a directory");
		}else{
			fileInfo.children = [];
		}

		return currentDir;

	})
	.then( readdir )
	.then(function( files ){

		// Recursively examine directory's children
		var promises = [];
		files.forEach(function( newFileName ){
			promises.push( createDirectoryObject( fileInfo.id, rootDir, fileName+'/'+newFileName, options ) );
		});

		// Wait for all children to complete before resolving main promise
		Q.all( promises ).then(function(data){

			if( options.sortType ){
				data = sortType( data );
			}

			fileInfo.children = data;
			deferred.resolve( fileInfo );
		});

	})
	.catch(function( err ){
		// Main promise should always resolve
		deferred.resolve( fileInfo );
	});

	return deferred.promise;

};

module.exports = createDirectoryObject;
