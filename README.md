Promisify Node
--------------

**Stable: 0.5.0** 

[![Build
Status](https://travis-ci.org/nodegit/promisify-node.png?branch=master)](https://travis-ci.org/nodegit/promisify-node)

Maintained by Tim Branyen [@tbranyen](http://twitter.com/tbranyen).

Wraps Node modules, functions, and methods written in the Node-callback style
to return Promises.

### Install ###

``` bash
npm install promisify-node
```

### Examples ###

Wrap entire Node modules recursively:

``` javascript
var promisify = require("promisify-node");
var fs = promisify("fs");

// This function has been identified as an asynchronous function so it has
// been automatically wrapped.
fs.readFile("/etc/passwd").then(function(contents) {
  console.log(contents);
});
```

Wrap a single function:

``` javascript
var promisify = require("promisify-node");

function async(callback) {
  callback(null, true);
}

// Convert the function to return a Promise.
var wrap = promisify(async);

// Invoke the newly wrapped function.
wrap().then(function(value) {
  console.log(value === true);
});
```

Wrap a method on an Object:

``` javascript
var promisify = require("promisify-node");

var myObj = {
  myMethod: function(a, b, cb) {
    cb(a, b);
  }
};

// No need to return anything as the methods will be replaced on the object.
promisify(myObj);

// Intentionally cause a failure by passing an object and inspect the message.
myObj.myMethod({ msg: "Failure!" }, null).then(null, function(err) {
  console.log(err.msg);
});
```

Wrap without mutating the original:
```javascript
var promisify = require("promisify-node");

var myObj = {
  myMethod: function(a, b, cb) {
    cb(a, b);
  }
};

// Store the original method to check later
var originalMethod = myObj.myMethod;

// Now store the result, since the 'true' value means it won't mutate 'myObj'.
var promisifiedObj = promisify(myObj, undefined, true);

// Intentionally cause a failure by passing an object and inspect the message.
promisifiedObj.myMethod({ msg: "Failure!" }, null).then(null, function(err) {
  console.log(err.msg);
});

// The original method is still intact
assert(myObj.myMethod === originalMethod);
assert(promisifiedObj.myMethod !== myObj.myMethod);
```

### Tests ###

Run the tests after installing dependencies with:

``` bash
npm test
```
