function A(d) { this.d = d; }
A.prototype.a = function(cb) { setTimeout(cb, this.d); };
module.exports = A;
