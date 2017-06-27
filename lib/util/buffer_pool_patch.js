const {Readable, Writable} = require( 'stream' );

if ( !Readable.prototype.__push__ ) {
  Readable.prototype.__push__ = Readable.prototype.push;
  Readable.prototype.push = function ( chunk, encoding ) {
    if ( chunk && typeof chunk.ref === 'function' ) {
      chunk.ref();
    }
    return this.__push__( chunk, encoding );
  };
}

if ( !Writable.prototype.__write__ ) {
  Writable.prototype.__write__ = Writable.prototype.write;
  Writable.prototype.write = function ( chunk, encoding, cb ) {
    if ( !(chunk && typeof chunk.unref === 'function') ) {
      return this.__write__( chunk, encoding, cb );
    }
    function callback( err ) {
      chunk.unref();
      if ( cb ) {
        cb( err );
      }
    }

    return this.__write__( chunk, encoding, callback );
  };
}
