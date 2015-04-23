'use strict';

/**
 * Dependencies
 */

const EventEmitter = require('events').EventEmitter;
const pathToRegExp = require('path-to-regexp');
const fetchBody = require('raw-body');
const stringify = require('json-stringify-safe');
const methods = require('methods');
const assert = require('assert');
const format = require('util').format;
const is = require('is_js');


/**
 * Interceptor
 */

class Interceptor extends EventEmitter {
  constructor (interaptor, host) {
    super();
    
    // keep reference to Interaptor
    this._interaptor = interaptor;
    
    this.host = host;
    this._headers = {};
    this._statusCode = 200;
    this._body = null;
    this._times = 1; // times to intercept, before .disable()
    
    // values to assert
    this._asserts = {
      headers: {},
      body: null
    };
    
    // custom handler functions
    this._respondFn = null;
    this._assertFn = null;
  }
  
  
  /**
   * Set to intercept requests N times
   *
   * @example
   * times(2)
   *
   * @api public
   */
  
  times (n) {
    this._times = n;
    
    return this;
  }
  
  
  /**
   * Set headers, status code or body on response
   *
   * @example
   * set('Content-Type', 'application/json')
   * set(200)
   * set('some response body')
   * set(function (req, res) {
   *
   * })
   *
   * @api public
   */
  
  set (a, b) {
    // header
    if (arguments.length === 2) {
      let name = a;
      let value = b;
      
      this._headers[name] = value;
      
      return this;
    }
    
    // status code
    if (arguments.length === 1 && is.number(a)) {
      this._statusCode = a;
      
      return this;
    }
    
    // function
    if (arguments.length === 1 && is.function(a)) {
      this._respondFn = a;
      
      return this;
    }
    
    // plain body
    if (arguments.length === 1 && is.string(a)) {
      this._body = a;
      
      return this;
    }
    
    // JSON body
    if (arguments.length === 1 && is.object(a)) {
      this._body = stringify(a);
      
      return this;
    }
  }
  
  
  /**
   * Assert request header and body
   *
   * @example
   * expect('Content-Type', 'application')
   * expect('some request body')
   * expect(function (req) {
   *
   * })
   *
   * @api public
   */
  
  expect (a, b) {
    //header
    if (arguments.length === 2) {
      let name = a;
      let value = b;
      
      this._asserts.headers[name] = value;
      
      return this;
    }
    
    // status code
    if (arguments.length === 1 && is.number(a)) {
      this._asserts.statusCode = a;
      
      return this;
    }
    
    // function
    if (arguments.length === 1 && is.function(a)) {
      this._assertFn = a;
      
      return this;
    }
    
    // plain body
    if (arguments.length === 1 && is.string(a)) {
      this._asserts.body = a;
      
      return this;
    }
    
    // JSON body
    if (arguments.length === 1 && is.object(a)) {
      this._asserts.body = stringify(a);
      
      return this;
    }
  }
  
  
  /**
   * Disable this rule
   *
   * @api public
   */
  
  disable () {
    this._interaptor.interceptors = this._interaptor.interceptors.filter(interceptor => interceptor != this);
    this._interaptor = null;
    this._headers = null;
    this._body = null;
    this._asserts = null;
    this._respondFn = null;
    this._assertFn = null;
  }
  
  
  /**
   * Handle matching request
   *
   * @api private
   */
  
  _handleRequest (req, res) {
    // receive request body
    fetchBody(req, (err, body) => {
      if (err) return this._throw(err);
      
      req.body = body.toString();
      
      // run assertions
      this._assertRequest(req);
      
      // respond to request
      // with defined values
      this._respondRequest(req, res);
      
      // disable itself
      if (--this._times <= 0) this.disable();
    });
  }
  
  
  /**
   * Run assertions on request
   *
   * @api private
   */
  
  _assertRequest (req) {
    let asserts = this._asserts;
    
    // assert headers
    Object.keys(asserts.headers).forEach(name => {
      let expectedValue = asserts.headers[name];
      let actualValue = req.headers[name.toLowerCase()];
      
      let error = format('Got %s, expected %s in %s header', actualValue, expectedValue, name);
      this._assert(actualValue === expectedValue, error);
    });
    
    // assert body
    if (asserts.body) {
      let error = format('Got %s, expected %s in request body', req.body, asserts.body);
      this._assert(asserts.body === req.body, error);
    }
    
    // custom assert function
    if (this._assertFn) {
      try {
        this._assertFn(req);
      } catch (err) {
        this._throw(err);
      }
    }
  }
  
  
  /**
   * Respond to request with defined values
   *
   * @api private
   */
  
  _respondRequest (req, res) {
    // set headers
    Object.keys(this._headers).forEach(name => {
      let value = this._headers[name];
      
      res.setHeader(name, value);
    });
    
    res.statusCode = this._statusCode;
    
    if (this._respondFn) {
      this._respondFn(req, res);
    }
    
    res.end(this._body);
  }
  
  
  /**
   * Utility to assert and throw error or emit event
   * if there are "error" listeners
   *
   * @api private
   */
  
  _assert (value, message) {
    try {
      assert(value, message);
    } catch (err) {
      this._throw(err);
    }
  }
  
  
  /**
   * Throw error or emit event
   * if there are "error" listeners
   *
   * @api private
   */
  
  _throw (err) {
    let listeners = this.listeners('error').length;
    if (listeners === 0) throw err;
    
    this.emit('error', err);
  }
}


// iterate over all HTTP methods
// and create a method on Interceptor
// to set this method and path
methods.forEach(method => {
  Interceptor.prototype[method] = function (path) {
    this.method = method;
    this.path = is.regexp(path) ? path : pathToRegExp(path);
    
    return this;
  };
});


/**
 * Expose interceptor
 */

module.exports = Interceptor;
