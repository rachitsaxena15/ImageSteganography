'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const mustache = require('mustache');
const querystring = require('querystring');
const multer = require('multer');
const upload = multer();

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';
const IMG_FIELD = 'filemsg';

function serve(port, base, steg, model) {
	const app = express();
	app.locals.port = port;
	app.locals.base = "";//base;
	app.locals.steg = steg;
	app.locals.model = model;
	process.chdir(__dirname);
	app.use("/", express.static(STATIC_DIR));
	setupTemplates(app);
	setupRoutes(app);
	app.listen(port, function() {
		console.log(`listening on port ${port}`);
	});
}


module.exports = serve;

/******************************** Routes *******************************/

function setupRoutes(app) {
	const base = app.locals.base;
	app.get(`${base}/hide.html`, hide(app));
	app.post(`${base}/hide.html`, bodyParser.urlencoded({limit: '50mb', extended: false}), 
			upload.single(IMG_FIELD), hide(app));

	app.get(`${base}/unhide.html`, unhide(app));
	app.post(`${base}/unhide.html`, bodyParser.urlencoded({extended: false}), unhide(app));
}

function hide(app) {
	return async function(req, res) {
		const images = await app.locals.model.list("inputs");
		let model, message, tplId;
		let imgArr = {images: images};
		for(let i = 0; i<images.length; i++){
			imgArr.images[i] = ({value: images[i]});
		}

		//Display hide.html - first time the page loads(no incoming request)
		if(!req.body){
			if(images.length>0){
				model = { base: app.locals.base, images: imgArr.images, imageUrl: app.locals.model.imageUrl, showForm: true };
			}
			else
				model = {base: app.locals.base, msg: `No Images found in database`, showForm: false };
			const html = doMustache(app, 'hide', model);
			res.send(html);
		}

		//User submits form
		else{
			const img = req.body.imgSelect;

			for(let i = 0; i<images.length; i++){
				if(images[i].value === img)
					imgArr.images[i] = ({value: images[i].value, selected: true});
			}

			if(!req.body.imgSelect){  //If no image selected by the user
				if(!(req.body.msgSelect)){
					model = {base: app.locals.base, msg: `Please Select an image to continue`,
						images: imgArr.images, imageUrl: app.locals.model.imageUrl, showForm: true };
				}
				else if(req.body.msgSelect === 'upload'){ //Selects no image but selects upload
          let mess;
          if(req.body.textmsg)
            mess = req.body.textmsg;
          else
            mess = "";
					model = {base: app.locals.base, msg: `Please Select an image to continue`,
						images: imgArr.images, imageUrl: app.locals.model.imageUrl, file: `file not uploaded`, usrmsg: `${mess}`, showForm: true };
				}
				else if(req.body.msgSelect === 'text'){ //Selects no image but selects textbox
          let mess; 
          if(req.body.textmsg)
            mess = req.body.textmsg;
          else
            mess = "";
					model = {base: app.locals.base, msg: `Please Select an image to continue`,
						images: imgArr.images, imageUrl: app.locals.model.imageUrl, text: `text not given`, usrmsg: `${mess}`, showForm: true };
				}
				tplId = 'hide';
			}
			else{

				if((req.body.msgSelect === 'upload' && req.file)){
					message = extractMessage(req.file.buffer);
				}

				else if((req.body.msgSelect === 'upload' && !req.file)){
					let mess;
          if(req.body.textmsg)
            mess = req.body.textmsg;
          else
            mess = "";
					model = {base: app.locals.base, msg: `Select and upload message file to continue`,
						images: imgArr.images, imageUrl: app.locals.model.imageUrl, file: `file not uploaded`, usrmsg: `${mess}`, showForm: true };
					tplId = 'hide';
				}
				else if((req.body.msgSelect === 'text' && !req.body.textmsg )){
					model = {base: app.locals.base, msg: `Check text and type your message to continue`,
						images: imgArr.images, imageUrl: app.locals.model.imageUrl, text: `text not given`, showForm: true };
					tplId = 'hide';
				}
				else if((req.body.msgSelect === 'text' && req.body.textmsg )){
					message = req.body.textmsg;
				}
				else{
          let mess;
          if(req.body.textmsg)
            mess = req.body.textmsg;
          else
            mess = "";
					model = {base: app.locals.base, msg: `To continue, Select Input type of Message`,
						images: imgArr.images, imageUrl: app.locals.model.imageUrl, usrmsg: `${mess}`, showForm: true };
					tplId = 'hide';
				}

				if(message){
					try{
						const response = await app.locals.model.hide(img, message);
						if(response.status !== 201){
							if(img){    //if user selects the image and other conditions fail
								if((req.body.msgSelect === 'text')){	//Preselect text radio btn and enter text if any
									model = {base: app.locals.base, msg: `Status Code: ${response.status}. Error. Bad Data`,
										images: imgArr.images, imageUrl: app.locals.model.imageUrl, usrmsg: `${message}`, text: `text too big`, showForm: true };
								}
								else if((req.body.msgSelect === 'upload')){  //Preselect file radio btn without retaining uploaded file
									model = {base: app.locals.base, msg: `Status Code: ${response.status}. Error. Bad Data`,
										images: imgArr.images, imageUrl: app.locals.model.imageUrl, file: `Select file type`, showForm: true };
								}
								else{	//If no selection
									model = {base: app.locals.base, msg: `Status Code: ${response.status}. Error. Bad selection`,
										images: imgArr.images, imageUrl: app.locals.model.imageUrl, usrmsg: `${message}`, showForm: true };
								}
							}
							else{
								model = {base: app.locals.base, msg: `Status Code: ${response.status}. Error. Bad Data`,
									images: images, imageUrl: app.locals.model.imageUrl, showForm: true };
							}
							tplId = 'hide';
						}
						else{
							const loc = response.location;
							const img = loc.substring(loc.lastIndexOf("/")+1);
							model = {base: app.locals.base, location: `${response.location}`, img: `${img}`, showForm: false };
							tplId = 'hide';
						}
					}
					catch(err){
						model = {base: app.locals.base, msg: `Error. Bad Data`, 
							images: images, imageUrl: app.locals.model.imageUrl, showForm: true };
						tplId = 'hide';
					}
				}//End - if(message)
				else{
          if((req.body.msgSelect === 'text')){  //Preselect text radio button
						model = {base: app.locals.base, msg: `Error! Please provide a message`,
							images: images, imageUrl: app.locals.model.imageUrl, text: `Please provide a message`, showForm: true  };
          }
					else if((req.body.msgSelect === 'upload')){  //Preselect file radio btn
            let mess;
          	if(req.body.textmsg)
            	mess = req.body.textmsg;
	          else
  	          mess = "";
						model = {base: app.locals.base, msg: `Error! Please upload a file containing message`,
               images: imgArr.images, imageUrl: app.locals.model.imageUrl, file: `Please upload a file containing message`,
							 usrmsg: `${mess}`, showForm: true };
					}
					tplId = 'hide';
				}
			}//end-else User Submits form
			const html = doMustache(app, tplId, model);
			res.send(html);
		}
	};
};

function unhide(app){
	return async function(req, res) {
		const images = await app.locals.model.list("steg");
    let model, message, tplId;
    let imgArr = {images: images};
    for(let i = 0; i<images.length; i++){
      imgArr.images[i] = ({value: images[i]});
    }
		if(!req.body){	//Form displayed first time
      if(images.length>0){
        model = { base: app.locals.base, images: imgArr.images,
          imageUrl: app.locals.model.imageUrl, steg: `steg`, showForm: true };
      }
      else
        model = {base: app.locals.base, msg: `No Images found in database`, showForm: false};
      const html = doMustache(app, 'unhide', model);
      res.send(html);
		}
		
		else{// request for unhide
			const img = req.body.imgSelect;
			if(img){
				for(let i = 0; i<images.length; i++){
	        if(images[i].value === img)
          imgArr.images[i] = ({value: images[i].value, selected: true});
    	  }
				try{
					const response = await app.locals.model.unhide("steg", img);
          const revealed =  response.data.msg;
          model = {base: app.locals.base, revealed: `${revealed}`, showForm: false };
				}
				catch(err){
					model = {base: app.locals.base, msg: `Error! Please select a valid image and try again`,
            images: imgArr.images, steg: `steg`, imageUrl: app.locals.model.imageUrl, showForm: true };
				}
      }
      else{
        model = {base: app.locals.base, msg: `Error! Please select a valid image and try again`,
          images: imgArr.images, steg: `steg`, imageUrl: app.locals.model.imageUrl, showForm: true};
      }
			const html = doMustache(app, 'unhide', model);
      res.send(html);
		}//End- request for unhide
	};
};

function extractMessage(buffer){
	return buffer.toString('ascii', 0, buffer.length);
}
function doMustache(app, templateId, view) {
	const templates = { footer: app.templates.footer };
	return mustache.render(app.templates[templateId], view, templates);
}

function setupTemplates(app) {
	app.templates = {};
	for (let fname of fs.readdirSync(TEMPLATES_DIR)) {
		const m = fname.match(/^([\w\-]+)\.ms$/);
		if (!m) continue;
		try {
			app.templates[m[1]] =
				String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
		}
		catch (e) {
			console.error(`cannot read ${fname}: ${e}`);
			process.exit(1);
		}
	}
}
