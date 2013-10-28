var axon = require('axon');
var debug = require('debug')('cruise:node');
var Log = require('cruise-log');
var rpc = require('axon-rpc');
var uid = require('uid');


module.exports = Node;


function Node () {
  this._peers = [];
  this._term = 0;
  this._log = new Log();
  this._id = uid();
  this._heartbeat = Date.now();
}


Node.prototype.heartbeat = function (heartbeat) {
  if (arguments.length === 0) return this._heartbeat;
  this._heartbeat = heartbeat;
  return this;
};



Node.prototype.id = function () {
  return this._id;
};


Node.prototype.listen = function (port, callback) {
  debug('listening on port: %s...', port);

  var socket = axon.socket('rep');
  this.server = new rpc.Server(socket);
  socket.bind(port, callback);
};



Node.prototype.addPeer = function (host, port) {
  debug('adding peer %s:%s', host, port);

  var socket = axon.socket('req');
  var client = new rpc.Client(socket);
  socket.connect(port, host);
  this._peers.push(client);
};


Node.prototype.leader = function (leader) {
  if (!leader) return this._leader;
  this._leader = leader;
};


Node.prototype.term = function (term) {
  if (arguments.length === 0) return this._term;
  this._term = term;
};


Node.prototype.handle = function (name, fn) {
  this.server.expose.apply(this.server, arguments);
};


Node.prototype.clearHandlers = function (name, fn) {
  delete this.server.methods;
};