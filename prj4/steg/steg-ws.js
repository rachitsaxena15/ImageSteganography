'use strict'

const axios = require('axios');


function StegWs(baseUrl){
  this.imageUrl = `${baseUrl}`;
}

module.exports = StegWs;

StegWs.prototype.list = async function(group){
  try {
    const url = this.imageUrl + `/images/${group}`;
    const response = await axios.get(url);
    return response.data;
  }
  catch (err) {
    return err.response.data;
  }
};

StegWs.prototype.hide = async function(name, msg){
  try {
    const url = this.imageUrl + `/steg/inputs/${name}`;
    const data =  {'outGroup': 'steg', 'msg': msg};
    const response = await axios.post(url, data);
    return {'status': response.status, 'location': response.headers.location};
  }
  catch (err) {
    return {'status': err.response.status};
  };
};

StegWs.prototype.unhide = async function(group, name){
  try {
    const url = this.imageUrl + `/steg/${group}/${name}`;
    const response = await axios.get(url);
    return {'status': response.status, 'data': response.data};
  }
  catch (err) {
    return {'status': err.response.status};
  };
};

