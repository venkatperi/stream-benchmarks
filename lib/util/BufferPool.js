const debug = require( 'debug' )( 'BufferPool' );
const crypto = require( 'crypto' );
const EventEmitter = require( 'events' ).EventEmitter;

function shortId() {
  return crypto.randomBytes( 12 ).toString( "base64" )
}

function _nop() {}

class BufferPool extends EventEmitter {

  constructor( size, count ) {
    super();

    count = Number( count );
    if ( !count > 0 ) {
      return this.emit( 'error', new Error( 'count must be a positive number' ) );
    }

    size = Number( size );
    if ( !size > 0 ) {
      return this.emit( 'error', new Error( 'size must be a positive number' ) );
    }

    this.size = size;
    this.count = count;
    this._id = shortId();
    this._allocated = false;
    this._freeBuffers = {};
    this._usedBuffers = {};
    debug( `[${this._id}] ${size}x${count}` )
  }

  get free() {
    return Object.keys( this._freeBuffers ).length;
  }

  get used() {
    return Object.keys( this._usedBuffers ).length;
  }

  alloc() {
    if ( this._allocated ) {
      return;
    }
    debug( `[${this._id}] alloc()` );
    let self = this;
    for ( let i = 0; i < this.count; i++ ) {
      let buf = Buffer.allocUnsafe( this.size );
      buf.id = `${this._id}${i}`;
      buf.refCount = 0;
      buf.ref = function () {
        buf.refCount++;
      };
      buf.unref = function () {
        if ( buf.refCount > 0 ) {
          buf.refCount--;
          if ( buf.refCount === 0 ) {
            setImmediate( releaseBuffer, self, buf );
          }
        }
      };
      this.freeBuffer( buf );
    }
    this._allocated = true;
  }

  freeBuffer( buf ) {
    //debug( `[${this._id}] free ${buf.id} ${this.free}x${this.used}` );
    delete this._usedBuffers[buf.id];
    this._freeBuffers[buf.id] = buf;
    buf.refCount = 0;
    this.emit( 'free' );
  }

  useBuffer( buf ) {
    //debug( `[${this._id}] use  ${buf.id} ${this.free}x${this.used}` );
    delete this._freeBuffers[buf.id];
    this._usedBuffers[buf.id] = buf;
    buf.ref();
  }

  clear() {
    this._freeBuffers = {};
    this._usedBuffers = {};
  }

  freeAll() {
    for ( let id in this._usedBuffers ) {
      this.freeBuffer( this._usedBuffers[id] );
    }
  }

  getBuffer( cb, timeout ) {
    if ( !this._allocated ) {
      this.alloc();
    }
    cb = cb || _nop;
    timeout = Number( timeout );

    let invokeCb = ( buf ) => setImmediate( cb, buf );

    let self = this;
    let keys = Object.keys( this._freeBuffers );
    if ( keys.length > 0 ) {
      let buf = this._freeBuffers[keys[0]];
      this.useBuffer( buf );
      return invokeCb( buf );
    }

    if ( timeout < 0 ) {
      return invokeCb( null );
    }

    let timer = null;
    let clearTimer = () => {
      if ( timer ) {
        clearTimeout( timer );
        timer = null;
      }
    };

    let listener = () => self.getBuffer( ( buf ) => {
      if ( buf ) {
        clearTimer();
        return invokeCb( buf );
      }
      process.nextTick( () => self.once( 'free', listener ) )
    }, -1 );

    if ( timeout > 0 ) {
      timer = setTimeout( function () {
        self.removeListener( 'once', listener );
        self.emit( 'error', new Error( 'timeout waiting for buffer in getBuffer()' ) );
      }, timeout );
    }

    this.once( 'free', listener );
  }

}

function releaseBuffer( pool, buf ) {
  if ( !(pool._usedBuffers[buf.id] || pool._freeBuffers[buf.id]) ) {
    return pool.emit( 'error', 'Can\'t release buffer that\'s not ours.' )
  }
  pool.freeBuffer( buf );
}

module.exports = BufferPool;

