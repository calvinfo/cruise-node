var axon = require('axon');
var debug = require('debug');
var Log = require('cruise-log');
var rpc = require('axon-rpc');
var uid = require('hat');
var states = require('cruise-states');


/**
 * Set up our states
 */

var states = {
  follower: states.Follower,
  leader: states.Leader,
  candidate: states.Candidate
};


/**
 * Export the `Node` constructor
 */

module.exports = Node;


/**
 * `Node` contstructor
 */

function Node () {
  if (!(this instanceof Node)) return new Node();
  this._peers = [];
  this._term = 0;
  this._log = new Log();
  this._id = uid(12, 10);
  this._heartbeat = Date.now();
  this.debug = debug('cruise:node:' + this.id());
}


/**
 * Get or set the current state
 *
 * @param {String} state
 * @return {State}
 */

Node.prototype.state = function (state) {
  if (!state) return this._state;
  if (this._state) this._state.stop();

  var State = states[state];
  this.debug('changing state to %s', State.prototype.name);
  this._state = new State(this);
  this.updateRpc();
  this._state.start();
  this.heartbeat(Date.now());

  var self = this;
  this._state.once('change', function (state) { self.state(state); });
  return this;
};


/**
 * Stops the node and disconnects it from the current address
 *
 * @param {Function} callback
 */

Node.prototype.stop = function (callback) {
  this._state.stop();
  this.disconnect(callback);
};


/**
 * Sets up new RPC handlers for the node given its new state
 */

Node.prototype.updateRpc = function () {
  if (!this.server) return;

  this.clearHandlers();
  var rpc = this._state.rpc();
  this.handle(rpc);
  return this;
};


/**
 * Gets or sets the node's heartbeat
 */

Node.prototype.heartbeat = function (heartbeat) {
  if (arguments.length === 0) return this._heartbeat;
  this._heartbeat = heartbeat;
  return this;
};


/**
 * Return the node's log
 *
 * @return {Log} log
 */

Node.prototype.log = function () {
  return this._log;
};


/**
 * Return the node's id
 *
 * @return {String} id
 */

Node.prototype.id = function () {
  return this._id;
};


/**
 * Gets or sets the port that this node is bound to
 */

Node.prototype.port = function (port) {
  if (arguments.length === 0) return this._port;
  this._port = port;
  return this;
};


/**
 * Start the node listening on `port`
 *
 * @param {Number} port
 * @param {Function} callback
 */

Node.prototype.listen = function (port, callback) {
  this.port(port);
  this.debug('listening on port: %s...', port);

  this.socket = axon.socket('rep');
  this.server = new rpc.Server(this.socket);
  var self = this;
  this.socket.bind(port, function (err) {
    if (err) return callback && callback(err);
    self.updateRpc();
    self.addPeer('127.0.0.1', port);
    callback && callback();
  });
};


/**
 * Disconnects the node from whatever socket it is bound to.
 */

Node.prototype.disconnect = function (callback) {
  this.debug('disconnecting');
  this.socket.close(callback);
};


/**
 * Adds a server to the node's set of peers
 *
 * @param {String} host
 * @param {Number} port
 */

Node.prototype.addPeer = function (host, port) {
  this.debug('adding peer %s:%s', host, port);

  var added = this.peers().filter(function (client) {
    return client.host === host && client.port === port;
  });

  if (added.length) {
    this.debug('already added peer %s:%s', host, port);
    return this;
  }

  var socket = axon.socket('req');
  var client = new rpc.Client(socket);
  socket.connect(port, host);
  client.host = host;
  client.port = port;
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


Node.prototype.record = function (command, callback) {
  this._state.record(command, callback);
};
