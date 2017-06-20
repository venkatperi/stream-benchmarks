const Readable = require( 'stream' ).Readable;
const util = require( 'util' );

module.exports = GeneratorReader;

util.inherits( GeneratorReader, Readable );

function GeneratorReader( options ) {
  options = options || {};
  this._generator = options.generator || '';
	this._firstTime = true;
  Readable.call( this, options );
}

function next(stream) {
  var next = stream._generator.next();
  stream.push( next.done ? null : next.value );
}

GeneratorReader.prototype._read = function ( n ) {
	next(this);
};