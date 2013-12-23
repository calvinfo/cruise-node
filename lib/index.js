var axon = require('axon');
var debug = require('debug');
var Log = require('cruise-log');
var rpc = require('axon-rpc');
var uid = require('hat');
var States = require('cruise-states');


/**
 * Set up our states
 */

var states = {
  follower: States.Follower,
  leader: States.Leader,
  candidate: States.Candidate
};



module.exports = Node;


function Node () {
  if (!(this instanceof Node)) return new Node();
  this._peers = [];
  this._term = 0;
  this._log = new Log();
  this._id = uid(12, 10);
  this._heartbeat = Date.now();
  this.debug = debug('cruise:node:' + this.id());
}


Node.prototype.state = function (state) {
  var State = states[state];
  this.debug('changing state to %s', State.prototype.name);
  if (this._state) this._state.stop();
  this._state = new State(this);
  this.updateRpc();
  this._state.start();
  var self = this;
  this._state.once('change', function (state) { self.state(state); });
  this.heartbeat(Date.now());
  return this;
};


Node.prototype.stop = function (callback) {
  this._state.stop();
  this.disconnect(callback);
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


Node.prototype.port = function (port) {
  if (arguments.length === 0) return this._port;
  this._port = port;
  return this;
};


Node.prototype.listen = function (port, callback) {
  this.port(port);
  this.debug('listening on port: %s...', port);

  this.socket = axon.socket('rep');
  this.server = new rpc.Server(this.socket);
  var self = this;
  this.socket.bind(port, function (err) {
    if (err) return callback(err);
    self.updateRpc();
    self.addPeer('127.0.0.1', port);
  });
};


Node.prototype.disconnect = function (callback) {
  this.debug('disconnecting');
  this.socket.close(callback);
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
