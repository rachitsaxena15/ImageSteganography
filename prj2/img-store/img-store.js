'use strict';

const Ppm = require('./ppm');

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {promisify} = require('util'); //destructuring
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const exec = promisify(require('child_process').exec);
const mongo = require('mongodb').MongoClient;
//TODO: add require()'s as necessary

/** This module provides an interface for storing, retrieving and
 *  querying images from a database. An image is uniquely identified
 *  by two non-empty strings:
 *
 *    Group: a string which does not contain any NUL ('\0') 
 *           characters.
 *    Name:  a string which does not contain any '/' or NUL
 *           characters.
 *
 *  Note that the image identification does not include the type of
 *  image.  So two images with different types are regarded as
 *  identical iff they have the same group and name.
 *  
 *  Error Handling: If a function detects an error with a defined
 *  error code, then it must return a rejected promise rejected with
 *  an object containing the following two properties:
 *
 *    errorCode: the error code
 *    message:   an error message which gives details about the error.
 *
 *  If a function detects an error without a defined error code, then
 *  it may reject with an object as above (using a distinct error
 *  code), or it may reject with a JavaScript Error object as
 *  appropriate.
 */

function ImgStore(client, db) { //TODO: add arguments as necessary
	//TODO
	this.client = client;
	this.db = db;
}

ImgStore.prototype.close = close;
ImgStore.prototype.get = get;
ImgStore.prototype.list = list;
ImgStore.prototype.meta = meta;
ImgStore.prototype.put = put;

/** Factory function for creating a new img-store.
 */
async function newImgStore() {
	//TODO
	const client = await mongo.connect(MONGO_URL);
	const db = client.db(DB_NAME);
	return new ImgStore(client, db); //provide suitable arguments
}
module.exports = newImgStore;

/** URL for database images on mongodb server running on default port
 *  on localhost
 */
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'images';

const IMAGE_TABLES = 'imageInfos';
//List of permitted image types.
const IMG_TYPES = [
	'ppm', 
	'png'
];


/** Release all resources held by this image store.  Specifically,
 *  close any database connections.
 */
async function close() {
	//TODO
	this.client.close();
}

/** Retrieve image specified by group and name.  Specifically, return
 *  a promise which resolves to a Uint8Array containing the bytes of
 *  the image formatted for image format type.
 *
 *  Defined Error Codes:
 *
 *    BAD_GROUP:   group is invalid (contains a NUL-character).
 *    BAD_NAME:    name is invalid (contains a '/' or NUL-character).
 *    BAD_TYPE:    type is not one of the supported image types.
 *    NOT_FOUND:   there is no stored image for name under group.
 */
async function get(group, name, type) {
        //TODO: replace dummy return value
	
	if(isBadGroup(group))
                throw new ImgError('BAD_GROUP', 'bad image group');

	if(isBadName(name))
               throw new ImgError('BAD_NAME', `bad image name '${name}'`);

	if(isBadType(type))
                throw new ImgError('BAD_TYPE', 'bad image type ' + nameAndType[1]);
        let _id = toImgId(group, name, type);
        //Retrieve an image     
        const dbTable = this.db.collection(IMAGE_TABLES);
        let ret;
        try{
                ret = await dbTable.findOne({_id : _id}, {projection: {imgData:1, _id:0}});
                if(!ret)
                        throw new ImgError('NOT_FOUND',   `there is no stored image under group ${group}.`)
        }
        catch(err){
                throw err;
        }

        var fileData = ret.imgData;
        var view, bytes
        view = new ArrayBuffer(fileData.buffer.length);
        bytes = new Uint8Array(view);
        //console.log(fileData.buffer);
        for(let i = 0; i<fileData.buffer.length; i++)
                bytes[i] = fileData.buffer[i];
        //console.log(bytes)

         if(type === IMG_TYPES[1]){

                let srcPath =  os.tmpdir()+"/temp.ppm";
                      await write(srcPath, fileData);//, function(err, data))

                let destPath = os.tmpdir()+"/temp.png";
                let optionsObj = [srcPath, destPath];
                await convertImage(optionsObj);

                if(isBadPath(srcPath))
                throw new ImgError('NOT_FOUND', `file ${imgPath} not found`);
                        await read(destPath).then( (data) => {
                        fileData = data;
                });
                view = new ArrayBuffer(fileData.buffer.length);
                bytes = new Uint8Array(view);
		
		for(let i = 0; i<fileData.buffer.length; i++)
                        bytes[i] = fileData.buffer[i];

                fs.unlink(srcPath, (err)=>{});
                fs.unlink(destPath, (err)=>{});
        }
        return new Uint8Array(bytes);
}

/** Return promise which resolves to an array containing the names of
 *  all images stored under group.  The resolved value should be an
 *  empty array if there are no images stored under group.
 *
 *  The implementation of this function must not read the actual image
 *  bytes from the database.
 *
 *  Defined Errors Codes:
 *
 *    BAD_GROUP:   group is invalid (contains a NUL-character).
 */
async function list(group) {
	//TODO: replace dummy return value

	if(isBadGroup(group))
		throw new ImgError('BAD_GROUP', 'bad image group');

	const dbTable = this.db.collection(IMAGE_TABLES);
	const count = await dbTable.count();
	let arr =[];
	let ret;
	try{
		ret = await dbTable.find({group: group}, {projection: {name:1, _id:0}}).toArray();
		if(ret.length==0)
			throw new ImgError('NOT_FOUND',   `there is no stored image under group ${group}.`)
	}
	catch(err){
		throw err;
	}
	let j=0;
	for(let i=0; i<ret.length;i++){
		if(!arr.includes(ret[i].name)){
			arr[j] = ret[i].name;
			j++;
		}
	}
	return arr;
}

/** Return promise which resolves to an object containing
 *  meta-information for the image specified by group and name.
 *
 *  The return'd object must contain the following properties:
 *
 *    width:         a number giving the width of the image in pixels.
 *    height:        a number giving the height of the image in pixels.
 *    maxNColors:    a number giving the max # of colors per pixel.
 *    nHeaderBytes:  a number giving the number of bytes in the 
 *                   image header.
 *    creationTime:  the time the image was stored.  This must be
 *                   a number giving the number of milliseconds which 
 *                   have expired since 1970-01-01T00:00:00Z.
 *
 *  The implementation of this function must not read the actual image
 *  bytes from the database.
 *
 *  Defined Errors Codes:
 *
 *    BAD_GROUP:   group is invalid (contains a NUL-character).
 *    BAD_NAME:    name is invalid (contains a '/' or NUL-character).
 *    NOT_FOUND:   there is no stored image for name under group.
 */
async function meta(group, name) {
	//TODO: replace dummy return value

	if(isBadGroup(group))
		throw new ImgError('BAD_GROUP', 'bad image group');
	if(isBadName(name))
		throw new ImgError('BAD_NAME', `bad image name '${name}'`);
	const dbTable = this.db.collection(IMAGE_TABLES);
	let ret;
	try{
		let a =[];
		a = await dbTable.find({group: group, name: name}, {projection: {imgData:0}}).toArray();

		if(a.length===0)
			throw new ImgError('NOT_FOUND', `there is no stored image for ${name} under ${group}.`);
		if(a[0]['creationTime'] <= a[a.length-1]['creationTime'])
			ret = new Array(a[a.length-1]);
		else
			ret = new Array(a[0]);
	}
	catch(err){
		throw err;
	}
	if(!ret)
		throw new ImgError('NOT FOUND', `there is no stored image for ${name} under ${group}`);
	const info = { creationTime: ret[0]['creationTime']};
	return ['width', 'height', 'maxNColors', 'nHeaderBytes']
		.reduce((acc, e) => { acc[e] = ret[0][e]; return acc; }, info);    
}

/** Store the image specified by imgPath in the database under the
 *  specified group with name specified by the base-name of imgPath
 *  (without the extension).  The resolution of the return'd promise
 *  is undefined.
 *
 *  Defined Error Codes:
 *
 *    BAD_GROUP:   group is invalid (contains a NUL-character).
 *    BAD_FORMAT:  the contents of the file specified by imgPath does 
 *                 not satisfy the image format implied by its extension. 
 *    BAD_TYPE:    the extension for imgPath is not a supported type
 *    EXISTS:      the database already contains an image under group
 *                 with name specified by the base-name of imgPath
 *                 (without the extension). 
 *    NOT_FOUND:   the path imgPath does not exist.
 * 
 */
async function put(group, imgPath) {
	//TODO

	if(isBadGroup(group))
		throw new ImgError('BAD_GROUP', 'bad image group');	

	var fileData, bytes, view;
	let nameAndType = pathToNameExt(imgPath);


	if(isBadType(nameAndType[1]))
		throw new ImgError('BAD_TYPE', 'bad image type ' + nameAndType[1]);

	let _id = toImgId(group, nameAndType[0], nameAndType[1]);
	let converted = false;
	if(nameAndType[1] === IMG_TYPES[1]){
		let destPath =  os.tmpdir()+"/temp.ppm";
		let optionsObj = [imgPath, destPath];
		await convertImage(optionsObj);
		imgPath = destPath;
		converted = true;
	}
	//Read File
	if(isBadPath(imgPath))
		throw new ImgError('NOT_FOUND', `file ${imgPath} not found`);
	await read(imgPath).then( (data) => {
		fileData = data;	
	});

	view = new ArrayBuffer(fileData.length);
	bytes = new Uint8Array(view);
	for(let i = 0; i<fileData.length; i++)
		bytes[i] = fileData[i];
	let ppm = new Ppm(_id, bytes);

	if( !(ppm.width || ppm.height || ppm.maxNColors || ppm.nHeaderBytes) )
		throw new ImgError('BAD_FORMAT', 'bad image format');

	//Remove temp file if converted
	if(converted)
		fs.unlink(imgPath, (err)=>{});

	//Convert to base64 for storing in DB.
	let buff = new Buffer(fileData);
	let base64Data = buff.toString('base64');

	const json = createJson(group, ppm, _id, nameAndType[0]);
	const dups = [];
	const dbTable = this.db.collection(IMAGE_TABLES);


	//Store meta info of the image

	try {
		const ret = await dbTable.insertOne(json);
		//console.log(ret);
		assert(ret.insertedId === _id);
	}
	catch (err) {
		//isDuplicateError
		if (err.code ===11000) {
			dups.push(_id);
		}
		else {
			throw err;
		}
	}

	if(dups.length>0)
		throw new ImgError('EXISTS', `user(s) ${dups.join(', ')} already exist`);


	//If not duplicate, store image
	else{
		//Convert to base64 for storing in DB.
		let buff = new Buffer(fileData);
		let base64Data = buff.toString('base64');

		try{
			const record = {_id: _id};
			const newValues = {$set: {imgData: fileData}};
			const ret = await dbTable.updateOne(record, newValues);
			assert(ret.modifiedCount === 1)
		}
		catch(err){
			console.log(err);
		}
	}
	return;
}

//Utility functions

function createJson(group, ppm, _id, name){
	const width = ppm.width;
	const height = ppm.height;
	const maxNColors = ppm.maxNColors;
	const nHeaderBytes = ppm.nHeaderBytes;
	const creationTime = new Date();
	let jsonArray = {};
	jsonArray["_id"] = _id;
	jsonArray["group"] = group;
	jsonArray["name"] = name;
	jsonArray["width"] =(width);
	jsonArray["height"]=(height);
	jsonArray["maxNColors"]=(maxNColors);
	jsonArray["nHeaderBytes"]=(nHeaderBytes);
	jsonArray["creationTime"]=(creationTime);
	jsonArray["Author"] = "rachit";
	return jsonArray

}

async function convertImage(optionsObj){
	try {
		const cmd = 'convert '+ optionsObj[0]+' '+ optionsObj[1];
		const {stdout, stderr} = await exec(cmd); //destructuring
		return stdout.trim();
	}
	catch (err) {
		console.log(err);
		throw new ImgError('IMAGE_FAIL', 'cannot convert image');
	}
}


async function write(path, data){
	return await writeFile(path, data, function(err, data){
		if(err)
			throw error;
	});
}
async function read(path){
	var bytes, view;
	return await readFile(path, function(err, data){
		if (err) {
			die(`cannot read ${path}: ${err}`);
		}
		return bytes;
	});
}

const NAME_DELIM = '/', TYPE_DELIM = '.';

/** Form id for image from group, name and optional type. */
function toImgId(group, name, type) {
	let v = `${group}${NAME_DELIM}${name}`;
	if (type) v += `${TYPE_DELIM}${type}`
		return v;
}

/** Given imgId of the form group/name return [group, name]. */
function fromImgId(imgId) {
	const nameIndex = imgId.lastIndexOf(NAME_DELIM);
	assert(nameIndex > 0);
	return [imgId.substr(0, nameIndex), imgId.substr(nameIndex + 1)];
}

/** Given a image path imgPath, return [ name, ext ]. */
function pathToNameExt(imgPath) {
	const typeDelimIndex = imgPath.lastIndexOf(TYPE_DELIM);
	const ext = imgPath.substr(typeDelimIndex + 1);
	const name = path.basename(imgPath.substr(0, typeDelimIndex));
	return [name, ext];
}

//Error utility functions

function isBadGroup(group) {
	return (group.trim().length === 0 || group.indexOf('\0') >= 0) &&
		new ImgError('BAD_GROUP', `bad image group ${group}`);
}

function isBadName(name) {
	return (name.trim().length === 0 ||
			name.indexOf('\0') >= 0 || name.indexOf('/') >= 0) &&
		new ImgError('BAD_NAME', `bad image name '${name}'`);
}

function isBadExt(imgPath) {
	const lastDotIndex = imgPath.lastIndexOf('.');
	const type = (lastDotIndex < 0) ? '' : imgPath.substr(lastDotIndex + 1);
	return IMG_TYPES.indexOf(type) < 0 &&
		new ImgError('BAD_TYPE', `bad image type '${type}' in path ${imgPath}`);
}

function isBadPath(path) {
	return !fs.existsSync(path) &&
		new ImgError('NOT_FOUND', `file ${path} not found`);
}

function isBadType(type) {
	return IMG_TYPES.indexOf(type) < 0 &&
		new ImgError('BAD_TYPE', `bad image type '${type}'`);
}

/** Build an image error object using errorCode code and error 
 *  message msg. 
 */
function ImgError(code, msg) {
	this.errorCode = code;
	this.message = msg;
}

