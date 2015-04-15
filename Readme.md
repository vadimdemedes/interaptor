# interaptor

Intercept HTTP requests for testing purposes. Uses [mitm](https://npmjs.com/package/mitm) under the hood.


### Installation

```
$ npm install interaptor --save
```


### Usage

```javascript
const intercept = require('interaptor');
const request = require('request');

intercept('api.digitalocean.com')
	.get('/v2/droplets') // intercept http://api.digitalocean.com/v2/droplets only
	.set('Content-Type', 'application/json') // set Content-Type response header
	.set(200) // set response status code
	.set(droplets) // set response body (if object, will be JSON.stringify'ed)

request('http://api.digitalocean.com/v2/droplets', function (err, res, body) {
	// request was not sent to api.digitalocean.com
	// request was intercepted by interaptor
});
```


### Tests

```
$ make test
```


### License

Interaptor is released under the MIT license.
