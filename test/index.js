var promisify = require("../");
var assert = require("assert");

describe("Promisify", function() {
  it("can convert a basic async function", function(done) {
    function test(cb) {
      cb(null, true);
    }

    var wrappedTest = promisify(test);
    
    wrappedTest().then(function(value) {
      assert.ok(value);
      done();
    });
  });

  it("exports a callbacks array", function() {
    assert(Array.isArray(promisify.callbacks));
  });
});
