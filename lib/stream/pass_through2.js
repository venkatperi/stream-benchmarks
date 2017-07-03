const Transform = require( 'stream' ).Transform;
const util = require( 'util' );

module.exports = PassThrough2;

util.inherits( PassThrough2, Transform );

function PassThrough2( options ) {
  options = options || {};
  Transform.call( this, options );
}

PassThrough2.prototype._transform = function ( chunk, enc, cb ) {
  cb( null, chunk );
};
