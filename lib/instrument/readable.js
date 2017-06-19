const Readable = require( 'stream' ).Readable;
const Measured = require( 'measured' );

Readable.prototype.__push__ = Readable.prototype.push;
Readable.prototype.__read__ = Readable.prototype.read;

Object.defineProperty( Readable.prototype, 'stats', {
  get() {
    const state = this._readableState;
    if ( state === undefined ) {
      return undefined;
    }
    if ( !state.__stats ) {
      state.__stats = {
        push : new Measured.Meter(),
        read : new Measured.Meter()
      }
    }
    return state.__stats;
  }
} );

Readable.prototype.read = function ( n ) {
  let stats = this.stats;
  stats.read.mark( n );

  return this.__read__( n );
};

Readable.prototype.push = function ( chunk, encoding ) {
  const state = this._readableState;
  let stats = this.stats;

  if ( !state.objectMode ) {
    if ( typeof chunk === 'string' ) {
      encoding = encoding || state.defaultEncoding;
      if ( encoding !== state.encoding ) {
        chunk = Buffer.from( chunk, encoding );
        encoding = '';
      }
    }
    stats.push.mark( chunk.length );
  }
  else {
    stats.push.mark();
  }

  return this.__push__( chunk, encoding );
}
