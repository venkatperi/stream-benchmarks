const Writable = require( 'stream' ).Writable;
const util = require( 'util' );

module.exports = NullWriter;

util.inherits( NullWriter, Writable );

function NullWriter( options ) {
  Writable.call( this, options );
}

NullWriter.prototype._write = function ( chunk, enc, cb ) {
  cb();
};



