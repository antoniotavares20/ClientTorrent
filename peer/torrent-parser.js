'use strict';
//biblioteca de manipulação de arquivo
const fs = require('fs');
//biblioteca para trocas de mensagens similar ao JSON
const bencode = require('bencode');
//biblioteca para suportar e manipular mensagens udp
const crypto = require('crypto');
//biblioteca para suportar o valor do buffer
const bignum = require('bignum');

module.exports.open = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

//função Hash para id
module.exports.infoHash = torrent => {
      const info = bencode.encode(torrent.info);
  return crypto.createHash('sha1').update(info).digest();
};

// funçaõ de visualização do anuncio
module.exports.size = torrent => {
  const size = torrent.info.files ?
    torrent.info.files.map(file => file.length).reduce((a, b) => a + b) :
    torrent.info.length;

 return bignum.toBuffer(size, {size: 8})
 //return bignum.format(buffer2,'bin' , {size: 8});
  //format(buffer2, 'bin', {groupsize:8})  ;
 //returm toString(size,{size: 8})
};