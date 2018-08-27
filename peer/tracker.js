'use strict';
//biblioteca de suporte a UDP
const dgram = require('dgram');
//Utilização do Buffer para as mensagens
const Buffer = require('buffer').Buffer;
//Padrao adotado para a troca de informacoes
const urlParse = require('url').parse;
//Biblioteca que suporta as informaões para o Buffer criando numeros aleatorios
const crypto = require('crypto');

const torrentParser = require('./torrent-parser');
const util = require('./util');

module.exports.getPeers = (torrent, callback) => {
  const socket = dgram.createSocket('udp4');
  const url = torrent.announce.toString('utf8');

  // Função que substitui a função socket.sent propriamente para UDP
  udpSend(socket, buildConnReq(), url);

  socket.on('message', response => {
//recebe a resposata para a conexão
    if (respType(response) === 'connect') {
      const connResp = parseConnResp(response);
//Solicita o anuncio dos peers na rede
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
 //envia as opções de peers para seleção
      udpSend(socket, announceReq, url);
    } else if (respType(response) === 'announce') {
      // responde  os anuncios
      const announceResp = parseAnnounceResp(response);
      // função de callback para novos anuncios e quantificação de peers na rede
      callback(announceResp.peers);
    }
  });
};


function udpSend(socket, message, rawUrl, callback=()=>{}) {
  const url = urlParse(rawUrl);
  socket.send(message, 0, message.length, url.port, url.hostname, callback);
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  if (action === 0) return 'connect';
  if (action === 1) return 'announce';
}


function buildConnReq() {
//cria um buffer vasio de 16bytes
  const buf = Buffer.allocUnsafe(16);

  // escreve o ID da conexao
  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);
  // define a ação para os proxios 4 bits e deslocamento em 8 bits
  buf.writeUInt32BE(0, 8);
  //  controla a transação dos IDs
  crypto.randomBytes(4).copy(buf, 12);

  return buf;
}

function parseConnResp(resp) {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8)
  }
}
//conforme o esperado as mensagens devem seguir o padrão BitTorrent.org
//a função recebe como parametro o torrent que é passado diretamente para o Buffer
function buildAnnounceReq(connId, torrent, port=8000) {
  const buf = Buffer.allocUnsafe(98);
  // representa a conexao unica do peer com a reserve de 98 bits do buffer

  connId.copy(buf, 0);
  // verfica a ação
  buf.writeUInt32BE(1, 8);
  // representa o ID de transação
  crypto.randomBytes(4).copy(buf, 12);
  // informaçẽos do hesh
  torrentParser.infoHash(torrent).copy(buf, 16);
  // informação do peer
  util.genId().copy(buf, 36);
  // espaço para o download
  Buffer.alloc(8).copy(buf, 56);
  // left
  torrentParser.size(torrent).copy(buf, 64);
  // upload
  Buffer.alloc(8).copy(buf, 72);
  // evento
  buf.writeUInt32BE(0, 80);
  // endereço de IP
  buf.writeUInt32BE(0, 80);
  // chave
  crypto.randomBytes(4).copy(buf, 88);
  // numero aleatorie
  buf.writeInt32BE(-1, 92);
  // porta do peer
  buf.writeUInt16BE(port, 96);

  return buf;
}

function parseAnnounceResp(resp) {
  function group(iterable, groupSize) {
    let groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }
    return groups;
  }

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: group(resp.slice(20), 6).map(address => {
      return {
        ip: address.slice(0, 4).join('.'),
        port: address.readUInt16BE(4)
      }
    })
  }
}