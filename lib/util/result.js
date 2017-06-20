module.exports = function(obj, ...args) {
  if (typeof obj === 'function')
    return obj(args);
  return obj;
}
