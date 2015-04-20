'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

/**
 * Dependencies
 */

var EventEmitter = require('events').EventEmitter;
var fetchBody = require('raw-body');
var stringify = require('json-stringify-safe');
var methods = require('methods');
var assert = require('assert');
var format = require('util').format;
var is = require('is_js');

/**
 * Interceptor
 */

var Interceptor = (function (_EventEmitter) {
  function Interceptor(interaptor, host) {
    _classCallCheck(this, Interceptor);

    _EventEmitter.call(this);

    // keep reference to Interaptor
    this.interaptor = interaptor;

    this.host = host;
    this.headers = {};
    this.statusCode = 200;
    this.body = null;

    // values to assert
    this._asserts = {
      headers: {},
      body: null
    };

    // custom handler functions
    this._respondFn = null;
    this._assertFn = null;
  }

  _inherits(Interceptor, _EventEmitter);

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

  Interceptor.prototype.set = function set(a, b) {
    // header
    if (arguments.length === 2) {
      var _name = a;
      var value = b;

      this.headers[_name] = value;

      return this;
    }

    // status code
    if (arguments.length === 1 && is.number(a)) {
      this.statusCode = a;

      return this;
    }

    // function
    if (arguments.length === 1 && is['function'](a)) {
      this._respondFn = a;

      return this;
    }

    // JSON body
    if (arguments.length === 1 && is.object(a)) {
      this.body = stringify(a);

      return this;
    }

    // plain body
    if (arguments.length === 1 && is.string(a)) {
      this.body = a;

      return this;
    }
  };

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

  Interceptor.prototype.expect = function expect(a, b) {
    //header
    if (arguments.length === 2) {
      var _name2 = a;
      var value = b;

      this._asserts.headers[_name2] = value;

      return this;
    }

    // status code
    if (arguments.length === 1 && is.number(a)) {
      this._asserts.statusCode = a;

      return this;
    }

    // function
    if (arguments.length === 1 && is['function'](a)) {
      this._assertFn = a;

      return this;
    }

    // JSON body
    if (arguments.length === 1 && is.object(a)) {
      this._asserts.body = stringify(a);

      return this;
    }

    // plain body
    if (arguments.length === 1 && is.string(a)) {
      this._asserts.body = a;

      return this;
    }
  };

  /**
   * Disable this rule
   *
   * @api public
   */

  Interceptor.prototype.disable = function disable() {
    var _this = this;

    this.interaptor.interceptors = this.interaptor.interceptors.filter(function (interceptor) {
      return interceptor != _this;
    });
    this.interaptor = null;
    this.headers = null;
    this.body = null;
    this._asserts = null;
    this._respondFn = null;
    this._assertFn = null;
  };

  /**
   * Handle matching request
   *
   * @api private
   */

  Interceptor.prototype._handleRequest = function _handleRequest(req, res) {
    var _this2 = this;

    // receive request body
    fetchBody(req, function (err, body) {
      if (err) return _this2._throw(err);

      req.body = body.toString();

      // run assertions
      _this2._assertRequest(req);

      // respond to request
      // with defined values
      _this2._respondRequest(req, res);

      // disable itself
      _this2.disable();
    });
  };

  /**
   * Run assertions on request
   *
   * @api private
   */

  Interceptor.prototype._assertRequest = function _assertRequest(req) {
    var _this3 = this;

    var asserts = this._asserts;

    // assert headers
    Object.keys(asserts.headers).forEach(function (name) {
      var expectedValue = asserts.headers[name];
      var actualValue = req.headers[name.toLowerCase()];

      var error = format('Got %s, expected %s in %s header', actualValue, expectedValue, name);
      _this3._assert(actualValue === expectedValue, error);
    });

    // assert body
    if (asserts.body) {
      var error = format('Got %s, expected %s in request body', req.body, asserts.body);
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
  };

  /**
   * Respond to request with defined values
   *
   * @api private
   */

  Interceptor.prototype._respondRequest = function _respondRequest(req, res) {
    var _this4 = this;

    // set headers
    Object.keys(this.headers).forEach(function (name) {
      var value = _this4.headers[name];

      res.setHeader(name, value);
    });

    res.statusCode = this.statusCode;

    if (this._respondFn) {
      this._respondFn(req, res);
    }

    res.end(this.body);
  };

  /**
   * Utility to assert and throw error or emit event
   * if there are "error" listeners
   *
   * @api private
   */

  Interceptor.prototype._assert = function _assert(value, message) {
    try {
      assert(value, message);
    } catch (err) {
      this._throw(err);
    }
  };

  /**
   * Throw error or emit event
   * if there are "error" listeners
   *
   * @api private
   */

  Interceptor.prototype._throw = function _throw(err) {
    var listeners = this.listeners('error').length;
    if (listeners === 0) throw err;

    this.emit('error', err);
  };

  return Interceptor;
})(EventEmitter);

// iterate over all HTTP methods
// and create a method on Interceptor
// to set this method and path
methods.forEach(function (method) {
  Interceptor.prototype[method] = function (path) {
    this.method = method;
    this.path = path;

    return this;
  };
});

/**
 * Expose interceptor
 */

module.exports = Interceptor;
