#!/usr/bin/env nodejs

'use strict';

const Ppm = require('./ppm');
const Steg = require('./steg');
var stgFound = false;

/** prefix which always precedes actual message when message is hidden
 *  in an image.
 */
const STEG_MAGIC = 'stg';

/** Constructor which takes some kind of ID and a Ppm image */
function StegModule(id, ppm) {
	this.id = id;
	this.ppm = ppm;
}

/** Hide message msg using PPM image contained in this StegModule object
 *  and return an object containing the new PPM image.
 *
 *  Specifically, this function will always return an object.  If an
 *  error occurs, then the "error" property of the return'd object
 *  will be set to a suitable error message.  If everything ok, then
 *  the "ppm" property of return'd object will be set to a Ppm image
 *  ppmOut which is derived from this.ppm with msg hidden.
 *
 *  The ppmOut image will be formed from the image contained in this
 *  StegModule object and msg as follows.
 *
 *    1.  The meta-info (header, comments, resolution, color-depth)
 *        for ppmOut is set to that of the PPM image contained in this
 *        StegModule object.
 *
 *    2.  A magicMsg is formed as the concatenation of STEG_MAGIC,
 *        msg and the NUL-character '\0'.
 *
 *    3.  The bits of the character codes of magicMsg including the
 *        terminating NUL-character are unpacked (MSB-first) into the
 *        LSB of successive pixel bytes of the ppmOut image.  Note
 *        that the pixel bytes of ppmOut should be identical to those
 *        of the image in this StegModule object except that the LSB of each
 *        pixel byte will contain the bits of magicMsg.
 *
 *  The function should detect the following errors:
 *
 *    STEG_TOO_BIG:   The provided pixelBytes array is not large enough 
 *                    to allow hiding magicMsg.
 *    STEG_MSG:       The image contained in this StegModule object may already
 *                    contain a hidden message; detected by seeing
 *                    this StegModule object's underlying image pixel bytes
 *                    starting with a hidden STEG_MAGIC string.
 *
 * Each error message must start with the above IDs (STEG_TOO_BIG, etc).
 */
StegModule.prototype.hide = function(msg) {
	//TODO: hide STEG_MAGIC + msg + '\0' into a copy of this.ppm
	//construct copy as shown below, then update pixelBytes in the copy.
	
	var magicMsg = STEG_MAGIC+msg+"\0";
	var pixelBytes = new Uint8Array(this.ppm.pixelBytes.length);
	var hexArr = new Array(magicMsg.length);
	var binArr = new Array(magicMsg.length);
	var i, j, count, error;

	var error = false;
	var errorMsg = "";
	
	var encode = true;
	
	//check if stg is already there
	var stegUnhide = new StegModule(this.id, this.ppm);
	stegUnhide.unhide();

	if(stgFound){
		error = true;
		errorMsg = "STEG_MSG: "+(this.id.substring(this.id.lastIndexOf("/")+1))+": image already contains a hidden message";
		encode = false;
	}
	
	//Image size validation
	const width = this.ppm.width;
	const height = this.ppm.height;
	const nBytesPerPixel = 3;
	const bitsPerChar = 8;
	const nStegMagicBytes = STEG_MAGIC.length;
	const maxMsgSize = parseInt(width*height*nBytesPerPixel/bitsPerChar) - nStegMagicBytes;
	if((msg.length) >= maxMsgSize){
		error = true;
		errorMsg = "STEG_TOO_BIG: "+(this.id.substring(this.id.lastIndexOf("/")+1))+": message too big to be hidden in image";
		encode = false;
	}


	if(encode){
		//enoding begin
		var ppmOut= this.ppm;

		pixelBytes = this.ppm.pixelBytes;
		//Convert string to its corresponding binary
		for(var i=0; i<(magicMsg.length); i++){
			hexArr[i] = strToHex(magicMsg[i]);
			binArr[i] = hexToBin(hexArr[i]);
		}
	
		i=0;		//Image Array
		j=0;		//Binary String Array
		count=0;	//index of Binary String array elements. max=7
	
		while(i < (magicMsg.length*8) ){
			//For each pixel byte
			var pixel = asciiToHex(pixelBytes[i]);
			//Check if bit-twiddling is required
			if( String(binArr[j].charAt(count)) != (pixel & 1)){
				if((pixel & 1) === 0){
					pixel = maskForOdd(pixel);
					pixelBytes[i] = strToAscii(hexToStr(pixel));
				}
				else{
					pixel = maskForEven(pixel);
					pixelBytes[i] = strToAscii(hexToStr(pixel));
				}
			}
	
			if((count+1)%8===0){
				j++;
				count=0;
			}
			else{
				count++;
			}
			i++;
			
			//Keep Adding pixel data in new object
			ppmOut.pixelBytes[i] = pixelBytes[i]
		}
	}

	if(!error)
		return { ppm: new Ppm(ppmOut) };
	else
		return {error: errorMsg};
}

/** Return message hidden in this StegModule object.  Specifically, if
 *  an error occurs, then return an object with "error" property set
 *  to a string describing the error.  If everything is ok, then the
 *  return'd object should have a "msg" property set to the hidden
 *  message.  Note that the return'd message should not contain
 *  STEG_MAGIC or the terminating NUL '\0' character.
 *
 *  The function will detect the following errors:
 *
 *    STEG_NO_MSG:    The image contained in this Steg object does not
 *                    contain a hidden message; detected by not
 *                    seeing this Steg object's underlying image pixel
 *                    bytes starting with a hidden STEG_MAGIC
 *                    string.
 *    STEG_BAD_MSG:   A bad message was decoded (the NUL-terminator
 *                    was not found).
 *
 * Each error message must start with the above IDs (STEG_NO_MSG, etc).
 */
StegModule.prototype.unhide = function() {
	//TODO
	var pixelBytes = this.ppm.pixelBytes;
	var decodedData = ""
		var temp="";
	var hexArr = new Array(pixelBytes.length);
	var error = false;
	var noNull = true;
	var errorMsg = "";

	for(var i=0; i<pixelBytes.length; i++){
		hexArr[i] = asciiToHex(pixelBytes[i]);
		//Store even and odd bit
		temp+= String(hexArr[i] & 1);
		// Check for corresponding hex code after 8-bit long binary code stored in temp
		if((i+1)%8===0  && i!=0){

			//Check validity of STEG_MAGIC string
			//data is decoded at the end of the loop. Hence add 8 bytes to steg_magic length to compare it's length with i
			if(decodedData.length == STEG_MAGIC.length && (i== ((STEG_MAGIC.length+1)*8)-1 ) ){
				if(!checkStegMagic(decodedData)){
					error = true;
					errorMsg ="STEG_NO_MSG: "+(this.id.substring(this.id.lastIndexOf("/")+1))+": no manifest constant detected";
					break;
				}
				else{
					stgFound = true;
					decodedData = "";
				}
			}
			if(temp==="00000000"){
				noNull = false;
				break;
			}
			decodedData += hexToStr(binToHex(temp));
			temp="";
		}
	}
	
	if( decodedData.length===0 || !(stgFound) ){
                error = true;
                errorMsg = "STEG_NO_MSG: "+(this.id.substring(this.id.lastIndexOf("/")+1))+": image does not have a message";
        }
	
	else if(noNull===true){
		error = true;
		errorMsg = "STEG_BAD_MSG: "+(this.id.substring(this.id.lastIndexOf("/")+1))+": bad message";
		decodedData="";
	}
	
	if(error)
		return {error : errorMsg};
	else
		return { msg: decodedData };

}

function maskForEven(hexString){
	var temp = hexToBin(hexString);
	var mask = temp[temp.length-1];
	mask= mask & ~1;
	temp = (temp.substring(0,7))+mask;
	var res = binToHex(temp);
	return res;
}

function maskForOdd(hexString){
	var temp = hexToBin(hexString);
	var mask = temp[temp.length-1];
	mask= mask | 1;
	temp = (temp.substring(0,7))+mask;
	var res = binToHex(temp);
	return res;

}
function checkStegMagic(str){
	if(str===STEG_MAGIC)
		return true;
	else
		return false;
}

function asciiToChar(code){
	var res = String.fromCharCode(code);
	return res;
}

function strToAscii(str){
	return str.charCodeAt(0);
}

function asciiToHex(code){
	var res = "0x"+Number(code).toString(16);
	return res;
}

function hexToStr(code) {
	var res = '';
	for (var i = 0; i < code.length; i += 2) {
		res += String.fromCharCode(parseInt(code.substr(i, 2), 16));
	}
	return res;
}

function strToHex(str) {
	var res = '';
	for(var i=0;i<str.length;i++) {
		if(str==="\n")
			res="00";
		else
			res += ''+str.charCodeAt(i).toString(16);
	}
	return "0x"+res;
}

function binToHex(code){
	//convert hex to int
	var res = parseInt(code,2).toString(16);
	return res;
}

function hexToBin(code){
	//convert hex to int
	var res = ("00000000"+parseInt(code,16).toString(2)).substr(-8);
	return res;
}

module.exports = StegModule;
