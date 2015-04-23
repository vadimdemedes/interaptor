'use strict';

/**
 * Dependencies
 */

const parse = require('url').parse;
const mitm = require('mitm');

const Interceptor = require('./interceptor');


/**
 * Expose interceptor
 */

module.exports = function intercept (host) {
  // initialize Interaptor
  Interaptor.initialize();
  
  // return created rule
  return Interaptor.create(host);
};


/**
 * Interceptor
 */

class Interaptor {
  /**
   * Initialize mitm
   *
   * @api private
   */
  
  static initialize () {
    if (this.mitm) return;
    
    this.mitm = mitm();
    this.mitm.on('connect', this.handleConnect.bind(this));
    this.mitm.on('request', this.handleRequest.bind(this));
    
    this.interceptors = [];
  }
  
  
  /**
   * Find interceptor for request
   *
   * @param {http.ClientRequest} req
   * @api private
   */
   
  static find (req) {
    // in node v0.10.x there is no
    // - req.method
    // - req.url or req.uri.path
    let method = (req.method || '').toLowerCase();
    let host = req.host || req.headers.host;
    let path;
    
    if (req.url) {
      let url = parse(req.url);
      path = url.pathname;
    } else {
      path = (req.uri || {}).pathname;
    }
    
    // find matching interceptors
    let interceptors = this.interceptors.filter(interceptor => {
      // if method, host and path match
      // interceptor is ok for this request
      let methodMatches = interceptor.method && method ? (interceptor.method === method) : true;
      let hostMatches   = interceptor.host && host ? (interceptor.host === host) : true;
      let pathMatches   = interceptor.path && path ? (interceptor.path.test(path)) : true;
      
      return methodMatches && hostMatches && pathMatches;
    });
    
    // return the first one
    return interceptors[0];
  }
  
  
  /**
   * Bypass TCP connection, if no interceptors are found
   *
   * @param {net.Socket} socket
   * @param {http.ClientRequest} req
   * @api private
   */
  
  static handleConnect (socket, req) {
    let interceptor = this.find(req);
    
    if (!interceptor) return socket.bypass();
  }
  
  
  /**
   * Execute an interceptor for this request
   *
   * @param {http.ClientRequest} req
   * @param {http.ServerResponse} res
   * @api private
   */
  
  static handleRequest (req, res) {
    let interceptor = this.find(req);
    
    interceptor._handleRequest(req, res);
  }
  
  
  /**
   * Disable interaptor
   *
   * @api private
   */
  
  static disable () {
    this.mitm.disable();
    this.mitm = null;
    
    this.interceptors.length = 0;
  }
  
  
  /**
   * Create new interceptor for a given host
   *
   * @param {String} host
   * @return {Interceptor}
   * @api private
   */
  
  static create (host) {
    let interceptor = new Interceptor(this, host);
    this.interceptors.push(interceptor);
    
    return interceptor;
  }
}
