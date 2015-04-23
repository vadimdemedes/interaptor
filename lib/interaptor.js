'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

/**
 * Dependencies
 */

var mitm = require('mitm');

var Interceptor = require('./interceptor');

/**
 * Expose interceptor
 */

module.exports = function intercept(host) {
  // initialize Interaptor
  Interaptor.initialize();

  // return created rule
  return Interaptor.create(host);
};

/**
 * Interceptor
 */

var Interaptor = (function () {
  function Interaptor() {
    _classCallCheck(this, Interaptor);
  }

  /**
   * Initialize mitm
   *
   * @api private
   */

  Interaptor.initialize = function initialize() {
    if (this.mitm) {
      return;
    }this.mitm = mitm();
    this.mitm.on('connect', this.handleConnect.bind(this));
    this.mitm.on('request', this.handleRequest.bind(this));

    this.interceptors = [];
  };

  /**
   * Find interceptor for request
   *
   * @param {http.ClientRequest} req
   * @api private
   */

  Interaptor.find = function find(req) {
    // in node v0.10.x there is no
    // - req.method
    // - req.url or req.uri.path
    var method = (req.method || '').toLowerCase();
    var host = req.host || req.headers.host;
    var path = req.url || (req.uri || {}).path;

    // find matching interceptors
    var interceptors = this.interceptors.filter(function (interceptor) {
      // if method, host and path match
      // interceptor is ok for this request
      var methodMatches = interceptor.method && method ? interceptor.method === method : true;
      var hostMatches = interceptor.host && host ? interceptor.host === host : true;
      var pathMatches = interceptor.path && path ? interceptor.path.test(path) : true;

      return methodMatches && hostMatches && pathMatches;
    });

    // return the first one
    return interceptors[0];
  };

  /**
   * Bypass TCP connection, if no interceptors are found
   *
   * @param {net.Socket} socket
   * @param {http.ClientRequest} req
   * @api private
   */

  Interaptor.handleConnect = function handleConnect(socket, req) {
    var interceptor = this.find(req);

    if (!interceptor) {
      return socket.bypass();
    }
  };

  /**
   * Execute an interceptor for this request
   *
   * @param {http.ClientRequest} req
   * @param {http.ServerResponse} res
   * @api private
   */

  Interaptor.handleRequest = function handleRequest(req, res) {
    var interceptor = this.find(req);

    interceptor._handleRequest(req, res);
  };

  /**
   * Disable interaptor
   *
   * @api private
   */

  Interaptor.disable = function disable() {
    this.mitm.disable();
    this.mitm = null;

    this.interceptors.length = 0;
  };

  /**
   * Create new interceptor for a given host
   *
   * @param {String} host
   * @return {Interceptor}
   * @api private
   */

  Interaptor.create = function create(host) {
    var interceptor = new Interceptor(this, host);
    this.interceptors.push(interceptor);

    return interceptor;
  };

  return Interaptor;
})();
