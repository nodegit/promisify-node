const Promise = require("nodegit-promise");
const args = require("./utils/args");
const cloneFunction = require("./utils/cloneFunction");
const objectAssign = require("object-assign");

// Unfortunately this list is not exhaustive, so if you find that a method does
// not use a "standard"-ish name, you'll have to extend this list.
var callbacks = ["cb", "callback", "callback_", "done"];

/**
 * Recursively operate over an object locating "asynchronous" functions by
 * inspecting the last argument in the parameter signature for a callback.
 *
 * @param {*} exports - Should be a function or an object, identity other.
 * @param {Function} test - Optional function to identify async methods.
 * @param {String} parentKeyName - Tracks the keyName in a digestable format.
 * @param {Boolean} noMutate - if set to true then all reference properties are
 * cloned to avoid mutating the original object.
 * @returns {*} exports - Identity.
 */
function processExports(exports, test, cached, parentKeyName, noMutate) {
  if(!exports) {
    return exports;
  }

  if(noMutate || typeof exports === "function") {
    // When not mutating we have to cache the original and the wrapped clone.
    var cacheResult = cached.filter(function(c) { return c.original === exports; });
    if(cacheResult.length) {
      return cacheResult[0].wrapped;
    }
  } else {
    // Return early if this object has already been processed.
    if (cached.indexOf(exports) > -1) {
      return exports;
    }
  }

  // Record this object in the cache, if it is not a function.
  if(typeof exports != "function") {
    cached.push(exports);
  }

  // Pass through if not an object or function.
  if (typeof exports != "object" && typeof exports != "function") {
    return exports;
  }

  var name = exports.name + "#";
  var target;

  // If a function, simply return it wrapped.
  if (typeof exports === "function") {
    var wrapped = exports;
    var isAsyncFunction = false;

    // Check the callback either passes the test function, or accepts a callback.
    if ((test && test(exports, exports.name, parentKeyName))
      // If the callback name exists as the last argument, consider it an
      // asynchronous function.  Brittle? Fragile? Effective.
      || (callbacks.indexOf(args(exports).slice(-1)[0]) > -1)) {
      // Assign the new function in place.
      wrapped = Promise.denodeify(exports);

      isAsyncFunction = true;
    } else if(noMutate) {
      // If not mutating, then we need to clone the function, even though it isn't async.
      wrapped = cloneFunction(exports);
    }

    // Set which object we'll mutate based upon the noMutate flag.
    target = noMutate ? wrapped : exports;

    // Here we can push our cloned/wrapped function and original onto cache.
    cached.push({
      original: exports,
      wrapped: wrapped
    });

    // Find properties added to functions.
    for (var keyName in exports) {
      target[keyName] = processExports(exports[keyName], test, cached, name, noMutate);
    }

    // Find methods on the prototype, if there are any.
    if (exports.prototype && Object.keys(exports.prototype).length) {
      // Attach the augmented prototype.
      wrapped.prototype = processExports(exports.prototype, test, cached, name, noMutate);
    }

    // Ensure attached properties to the previous function are accessible.
    // Only do this if it's an async (wrapped) function, else we're setting
    // __proto__ to itself, which isn't allowed.
    if(isAsyncFunction) {
      wrapped.__proto__ = exports;
    }

    return wrapped;
  }

  // Make a shallow clone if we're not mutating and set it as the target, else just use exports
  target = noMutate ? objectAssign({}, exports) : exports;

  // We have our shallow cloned object, so put it (and the original) in the cache
  if(noMutate) {
    cached.push({
      original: exports,
      wrapped: target
    });
  }

  Object.keys(target).map(function(keyName) {
    // Convert to values.
    return [keyName, target[keyName]];
  }).filter(function(keyVal) {
    var keyName = keyVal[0];
    var value = keyVal[1];

    // If an object is encountered, recursively traverse.
    if (typeof value === "object") {
      processExports(value, test, cached, keyName + ".", noMutate);
    } else if (typeof value === "function") {
      // If a filter function exists, use this to determine if the function
      // is asynchronous.
      if (test) {
        // Pass the function itself, its keyName, and the parent keyName.
        return test(value, keyName, parentKeyName);
      }

      return true;
    }
  }).forEach(function(keyVal) {
    var keyName = keyVal[0];
    var func = keyVal[1];

    // Wrap this function and reassign.
    target[keyName] = processExports(func, test, cached, parentKeyName, noMutate);
  });

  return target;
}

/**
 * Public API for Promisify.  Will resolve modules names using `require`.
 *
 * @param {*} name - Can be a module name, object, or function.
 * @param {Function} test - Optional function to identify async methods.
 * @param {Boolean} noMutate - Optional set to true to avoid mutating the target.
 * @returns {*} exports - The resolved value from require or passed in value.
 */
module.exports = function(name, test, noMutate) {
  var exports = name;

  // If the name argument is a String, will need to resovle using the built in
  // Node require function.
  if (typeof name === "string") {
    exports = require(name);
    // Unless explicitly overridden, don't mutate when requiring modules.
    noMutate = !(noMutate === false);
  }

  // Iterate over all properties and find asynchronous functions to convert to
  // promises.
  return processExports(exports, test, [], undefined, noMutate);
};

// Export callbacks to the module.
module.exports.callbacks = callbacks;
