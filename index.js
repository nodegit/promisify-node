const Promise = require("promise");
const args = require("./utils/args");

// Unfortunately this list is not exhaustive, so if you find that a method does
// not use a "standard"-ish name, you'll have to extend this list.
var callbacks = ["cb", "callback", "callback_", "done"];

/**
 * Recursively operate over an object locating "asynchronous" functions by
 * inspecting the last argument in the parameter signature for a callback.
 *
 * @param {*} exports - Should be a function or an object, identity other.
 * @returns {*} exports - Identity.
 */
function processExports(exports) {
  // Pass through if not an object or function.
  if (typeof exports != "object" && typeof exports != "function") {
    return exports;
  }

  // If a function, simply return it wrapped.
  if (typeof exports === "function") {
    return Promise.denodeify(exports);
  }

  Object.keys(exports).map(function(keyName) {
    // Convert to values.
    return [keyName, exports[keyName]];
  }).filter(function(keyVal) {
    var value = keyVal[1];

    // If an object is encountered, recursively traverse.
    if (typeof value === "object") {
      processExports(exports);
    }
    // Filter to functions with callbacks only.
    else if (typeof value === "function") {
      // If the callback name exists as the last argument, consider it an
      // asynchronous function.  Brittle? Fragile? Effective.
      if (callbacks.indexOf(args(value).slice(-1)[0]) > -1) {
        return true;
      }
    }
  }).forEach(function(keyVal) {
    var keyName = keyVal[0];
    var func = keyVal[1];

    // Assign the new function in place.
    exports[keyName] = Promise.denodeify(func);
  });

  return exports;
}

/**
 * Public API for Promisify.  Will resolve modules names using `require`.
 *
 * @param {*} name - Can be a module name, object, or function.
 * @returns {*} exports - The resolved value from require or passed in value.
 */
module.exports = function(name) {
  var exports = name;

  // If the name argument is a String, will need to resovle using the built in
  // Node require function.
  if (typeof name === "string") {
    exports = require(name);
  }

  // Iterate over all properties and find asynchronous functions to convert to
  // promises.
  return processExports(exports);
};

// Export callbacks to the module.
module.exports.callbacks = callbacks;
