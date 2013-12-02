var axon = require('axon');
var debug = require('debug');
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
  this.debug = debug('cruise:node:' + this._id);
}


Node.prototype.state = function (state) {
  this.debug('changing state to %s', state.prototype.name);
  this._state = state(this);
  this.updateRpc();
  var self = this;
  this._state.on('change', function (state) { self.state(state); });
  return this;
};



Node.prototype.updateRpc = function () {
  if (!this.server) return;

  this.clearHandlers();
  var rpc = this._state.rpc();
  this.handle(rpc);
  return this;
};


Node.prototype.heartbeat = function (heartbeat) {
  if (arguments.length === 0) return this._heartbeat;
  this._heartbeat = heartbeat;
  return this;
};


Node.prototype.log = function () {
  return this._log;
};



Node.prototype.id = function () {
  return this._id;
};


Node.prototype.listen = function (port, callback) {
  this.debug('listening on port: %s...', port);

  var socket = axon.socket('rep');
  this.server = new rpc.Server(socket);
  var self = this;
  socket.bind(port, function (err) {
    if (err) return callback(err);
    self.updateRpc();
    self.addPeer('127.0.0.1', port);
  });
};



Node.prototype.addPeer = function (host, port) {
  debug('adding peer %s:%s', host, port);

  var socket = axon.socket('req');
  var client = new rpc.Client(socket);
  socket.connect(port, host);
  this._peers.push(client);
  return this;
};


Node.prototype.peers = function () {
  return this._peers;
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
  this.server.methods = {};
};


Node.prototype.votedFor = function () {
  return this._votedFor;
};
