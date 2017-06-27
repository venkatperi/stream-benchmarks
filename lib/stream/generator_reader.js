const Readable = require( 'stream' ).Readable;
const util = require( 'util' );

module.exports = GeneratorReader;

util.inherits( GeneratorReader, Readable );

function GeneratorReader( options ) {
  options = options || {};
  this._generator = options.generator || '';
  Readable.call( this, options );
}

function next( stream ) {
  var next = stream._generator.next();
  return stream.push( next.done ? null : next.value );
}

GeneratorReader.prototype._read = function ( n ) {
  while ( next( this ) ) {}
};
