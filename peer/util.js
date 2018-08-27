'use strict';

const crypto = require('crypto');

let id = null;

module.exports.genId = () => {
  if (!id) {
    id = crypto.randomBytes(20);
    //Nome do primeiro peer
    Buffer.from('-PEER_001-').copy(id, 0);
    //neste caso o ID é gerado apenas uma vez e redefinido toda vez que novos peers sugem
  }
  return id;
};