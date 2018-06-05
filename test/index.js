var promisify = require("../");
var assert = require("assert"),
    fsOriginal = require('fs');

describe("Promisify", function() {
  function isPromisified(fn, ctx) {
    var result = fn && fn.apply(ctx, Array.prototype.slice.call(arguments, 2));
    return result && (typeof result.then === 'function');
  }

  it("can convert a basic async function", function() {
    function test(cb) {
      cb(null, true);
    }

    var wrappedTest = promisify(test);

    return wrappedTest().then(function(value) {
      assert.ok(value);
    });
  });

  it("exports a callbacks array", function() {
    assert(Array.isArray(promisify.callbacks));
  });

  describe("node modules", function() {
    it("can be consumed", function() {
      var fs = promisify("fs");
      return fs.readFile(__dirname + "/../LICENSE");
    });

    it("can promisify the same object twice without breaking", function() {
      var fs = promisify("fs");
      fs = promisify("fs");

      return fs.readFile(__dirname + "/../LICENSE");
    });

    it("doesn't mutate objects for other consumers", function() {
      var fsp = promisify("fs");
      var fs2 = require("fs");

      assert(fsOriginal.readFile !== fsp.readFile, "pre-required mutated");
      assert(fsOriginal.readFile === fs2.readFile, "post-required mutated");
      assert(fsp.readFile !== fs2.readFile, "post-required mutated");
    });

    it("doesn't mutate functions for other consumers", function() {
      var fn = require(__dirname + "/examples/fn-export.js");
      var fnx = fn.x;
      var fnp = promisify(__dirname + "/examples/fn-export.js");
      var fn2 = require(__dirname + "/examples/fn-export.js");

      assert(fn.x !== fnp, "pre-required mutated");
      assert(fn2.x !== fnp, "post-required mutated");
      assert(fn.x === fnx, "function property mutated");
      assert(fnp.x !== fn, "function property not replaced");
    });

    it("doesn't mutate prototypes for other consumers", function() {
      var A = require(__dirname + "/examples/proto-export.js");
      var a = new A(5);
      var Ap = promisify(__dirname + "/examples/proto-export.js");
      var ap = new Ap(5);
      var A2 = require(__dirname + "/examples/proto-export.js");
      var a2 = new A2(5);

      assert(isPromisified(ap.a, ap), "prototype method not promisified");
      assert(a.a !== ap.a, "pre-required mutated");
      assert(a2.a !== ap.a, "post-required mutated");
      assert(a2.a === a.a, "post-required mutated");
    });
  });

  describe("asynchronous method inference", function() {
    var later = function(cb) {
      setTimeout(cb(null), 0);
    };

    it("does not modify methods that do not appear to be asynchronous", function() {
      var obj = {
        a: function(probably, not, async) {}
      };
      var wrappedObj = promisify(obj);

      assert.equal(
        obj.a,
        wrappedObj.a
      );
    });

    it("can infer callback-accepting functions by argument list", function() {
      var obj = promisify({
        a: function(cb) { later(cb); }
      });

      return obj.a();
    });

    it("can infer callback-accepting arrow functions", function() {
      var obj = promisify({
        a: (cb) => { later(cb); }
      });

      return obj.a();
    });

    it("can infer callback-accepting functions by argument list", function() {
      var obj = promisify({
        a: function(callback) { later(callback); }
      });

      return obj.a();
    });

    it("can infer callback-accepting functions by argument list", function() {
      var obj = promisify({
        a: function(callback_) { later(callback_); }
      });

      return obj.a();
    });

    it("can infer callback-accepting functions by argument list", function() {
      var obj = promisify({
        a: function(done) { later(done); }
      });

      return obj.a();
    });

    it("can identify an asynchronous function by filter function", function() {
      var obj = promisify({
        a: function a() { arguments[0](); }
      }, function(func) {
        return func.name === "a";
      });

      return obj.a();
    });

    it("can iterate over prototypes", function() {
      function Test() {}

      Test.prototype = {
        a: function a() { arguments[0](); }
      };

      promisify(Test, function(func, keyName, parentKeyName) {
        return func.name === "a";
      });

      return new Test().a();
    });

    it("can deal with the same async function being present in an object more than once", function() {
      var a = {
        a: function(d, cb) {
          cb && cb(null, d);
        }
      };

      a.b = a.a;

      a = promisify(a);

      assert(a.a(5) !== undefined, "function not wrapped");
      assert(typeof a.a(5).then === "function", "function not wrapped");
      assert(a.b(5) !== undefined, "duplicate function not wrapped");
      assert(typeof a.b(5).then === "function", "duplicate function not wrapped");
    });

    it("can deal with cyclical function properties", function() {
      var a = function(d, cb) {
        cb && cb(null, d);
      };

      a.a = a;

      a = promisify(a);

      assert(a(5) !== undefined, "function not wrapped");
      assert(typeof a(5).then === "function", "function not wrapped");
      assert(a.a(5) !== undefined, "function property not wrapped");
      assert(typeof a.a(5).then === "function", "function property not wrapped");
    });
  });


  describe("no mutate", function() {
    it("can promisify an object without mutating it", function() {
      var a = {
        a: function(cb) { cb(); }
      };

      var b = promisify(a, undefined, true);

      assert(isPromisified(b.a, b), "method not promisified");
      assert(a.a !== b.a, "object mutated");
    });

    it("can promisify a function's properties without mutating it", function() {
      var a = function(cb){ cb(null, 1); };
      a.a = function(cb) { cb(); };

      var b = promisify(a, undefined, true);

      assert(isPromisified(b), "method not promisified");
      assert(isPromisified(b.a, b), "method property not promisified");
      assert(a.a !== b, "method property mutated");
      assert(a.a !== b.a, "method property mutated");
    });

    it("can promisify a constructor without mutating it", function() {
      var A = function(){ };
      A.a = function(cb) { cb(); };
      A.prototype.a = function(cb) { cb(null, 2); };

      var B = promisify(A, undefined, true);
      var b = new B();

      assert(isPromisified(B.a, B), "method property not promisified");
      assert(isPromisified(b.a, b), "prototype method not promisified");
      assert(A.a !== B.a, "method property mutated");
      assert(A.prototype.a !== b.a, "prototype mutated");
    });
  });
});
