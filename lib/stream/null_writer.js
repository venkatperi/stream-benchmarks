const Writable = require( 'stream' ).Writable;
const util = require( 'util' );

module.exports = NullWriter;

util.inherits( NullWriter, Writable );

function NullWriter( options ) {
  Writable.call( this, options );
  options = options || {};
  this.delay = options.delay;
  this.count = 0;
}

NullWriter.prototype._write = function ( chunk, enc, cb ) {
  if ( chunk ) {
    this.count += chunk.length;
  }
  if ( this.delay ) {
    return setTimeout( cb, this.delay );
  }
  cb();
};
