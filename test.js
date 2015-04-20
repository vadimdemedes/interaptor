/**
 * Dependencies
 */

const intercept = require('./');
const request = require('request');
const format = require('util').format;

require('chai').should();


/**
 * Tests
 */


describe ('interaptor', function () {
  itEach (['get', 'post', 'put', 'delete'], 'intercept %s request', function (method, done) {
    intercept('example.org')
      [method]('/some/path')
      .set(200)
      .set('intercepted ' + method);
    
    request({
      url: 'http://example.org/some/path',
      method: method
    }, function (err, res, body) {
      res.statusCode.should.equal(200);
      body.should.equal('intercepted ' + method);
      
      done(err);
    });
  });
  
  it ('set response code', function (done) {
    intercept('example.org')
      .get('/some/path')
      .set(401);
    
    request('http://example.org/some/path', function (err, res, body) {
      res.statusCode.should.equal(401);
      body.should.equal('');
      
      done();
    });
  });
  
  it ('set response headers', function (done) {
    intercept('example.org')
      .get('/some/path')
      .set('X-Test-Value', '123');
    
    request('http://example.org/some/path', function (err, res, body) {
      res.statusCode.should.equal(200);
      res.headers['x-test-value'].should.equal('123');
      body.should.equal('');
      
      done();
    });
  });
  
  it ('set response body', function (done) {
    intercept('example.org')
      .get('/some/path')
      .set('intercepted request');
    
    request('http://example.org/some/path', function (err, res, body) {
      res.statusCode.should.equal(200);
      body.should.equal('intercepted request');
      
      done();
    });
  });
  
  it ('set response body in json', function (done) {
    intercept('example.org')
      .get('/some/path')
      .set({ key: 'value' });
    
    request('http://example.org/some/path', function (err, res, body) {
      res.statusCode.should.equal(200);
      body.should.equal('{"key":"value"}');
      
      done();
    });
  });
  
  it ('set body in a custom handler function', function (done) {
    intercept('example.org')
      .get('/some/path')
      .set(function (req, res) {
        res.write('hello');
      });
    
    request('http://example.org/some/path', function (err, res, body) {
      res.statusCode.should.equal(200);
      body.should.equal('hello');
      
      done();
    });
  });
  
  it ('assert headers and continue', function (done) {
    intercept('example.org')
      .get('/some/path')
      .expect('X-Test-Flag', 'true');
    
    request({
      url: 'http://example.org/some/path',
      headers: {
        'X-Test-Flag': 'true'
      }
    }, done);
  });
  
  it ('assert headers and fail', function (done) {
    intercept('example.org')
      .get('/some/path')
      .expect('X-Test-Flag', 'false')
      .on('error', function (err) {
        err.message.should.equal('Got true, expected false in X-Test-Flag header');
        done();
      });
    
    request({
      url: 'http://example.org/some/path',
      headers: {
        'X-Test-Flag': 'true'
      }
    });
  });
  
  it ('assert body and continue', function (done) {
    intercept('example.org')
      .post('/some/path')
      .expect('some cool body');
    
    request({
      url: 'http://example.org/some/path',
      method: 'post',
      body: 'some cool body'
    }, done);
  });
  
  it ('assert json body and continue', function (done) {
    intercept('example.org')
      .post('/some/path')
      .expect({ key: 'value' });
    
    request({
      url: 'http://example.org/some/path',
      method: 'post',
      json: { key: 'value' }
    }, done);
  });
  
  it ('assert body and fail', function (done) {
    intercept('example.org')
      .post('/some/path')
      .expect('some body')
      .on('error', function (err) {
        err.message.should.equal('Got some cool body, expected some body in request body');
        done();
      });
    
    request({
      url: 'http://example.org/some/path',
      method: 'post',
      body: 'some cool body'
    });
  });
  
  it ('assert using custom function and fail', function (done) {
    intercept('example.org')
      .post('/some/path')
      .expect(function (req) {
        if (req.body === 'some cool body') {
          throw new Error('Some error');
        }
      })
      .on('error', function (err) {
        err.message.should.equal('Some error');
        done();
      });
    
    request({
      url: 'http://example.org/some/path',
      method: 'post',
      body: 'some cool body'
    });
  });
  
  it ('assert using custom function and continue', function (done) {
    intercept('example.org')
      .post('/some/path')
      .expect(function (req) {
        if (req.body !== 'some cool body') {
          throw new Error('Some error');
        }
      });
    
    request({
      url: 'http://example.org/some/path',
      method: 'post',
      body: 'some cool body'
    }, function () {
      done();
    });
  });
});


/**
 * Utilities
 */

function itEach (arr, desc, test) {
  arr.forEach(function (item) {
    it (format(desc, item), test.bind(null, item));
  });
}
