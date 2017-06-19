const Readable = require( 'stream' ).Readable;
const util = require( 'util' );

module.exports = StringReader;

util.inherits( StringReader, Readable );

function StringReader( options ) {
  options = options || {};
  this._maxChunks = options.maxChunks || -1;
  this._chunkCount = 0;
  this._payload = options.payload || '';
  Readable.call( this, options );
}

StringReader.prototype._read = function ( n ) {
  if ( this._maxChunks > 0 && this._chunkCount >= this._maxChunks ) {
    this.push( null );
    return;
  }

  this.push( this._payload );
  this._chunkCount++;
};