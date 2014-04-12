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
  });
});
