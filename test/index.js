var promisify = require("../");
var assert = require("assert");

describe("Promisify", function() {
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
});
