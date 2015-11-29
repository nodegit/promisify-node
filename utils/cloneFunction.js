/**
 * Clones a function, including copying any properties of the function to the clone.
 *
 * @param {Function} func - The function to clone.
 */
module.exports = function cloneFn(func) {
    var temp;
    // Check for the memoized value on the function in-case we get called to wrap the same function
    // (or already wrapped function) again.
    return func.__cloneFn || (temp = function() {
      return func.apply(this, arguments);
    }) &&
    // Assign __proto__ as a quick way to copy function properties.
    (temp.__proto__ = func) &&
    // Lastly, set a cache var on the original and clone, and return the result.
    (func.__cloneFn = temp.__cloneFn = temp);
};
