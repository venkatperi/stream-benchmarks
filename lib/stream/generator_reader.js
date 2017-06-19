const Readable = require( 'stream' ).Readable;
const util = require( 'util' );

module.exports = GeneratorReader;

util.inherits( GeneratorReader, Readable );

function GeneratorReader( options ) {
  options = options || {};
  this._generator = options.generator || '';
  Readable.call( this, options );
}

GeneratorReader.prototype._read = function ( n ) {
  let next = this._generator.next();
  this.push( next.done ? null : next.value );
};