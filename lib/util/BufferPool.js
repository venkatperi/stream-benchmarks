const crypto = require( 'crypto' );
const EventEmitter = require( 'events' ).EventEmitter;

function shortId() {
  return crypto.randomBytes( 12 ).toString( "base64" )
}

class BufferPool extends EventEmitter {

  constructor( opts = {} ) {
    super();

    this.size = opts.size || 64 * 1024 * 1024;
    this.capacity = opts.capacity || 100;

    this._id = shortId();
    this._freeBuffers = {};
    this._usedBuffers = {};
    this._dummyBuffers = {};
    this.count = 0;
    this.nextId = 0;
  }

  get dummies() {
    return Object.keys( this._dummyBuffers ).length;
  }

  get free() {
    return Object.keys( this._freeBuffers ).length;
  }

  get used() {
    return Object.keys( this._usedBuffers ).length;
  }

  actuallyAlloc( size ) {
    let self = this;
    let buf = Buffer.allocUnsafe( size );
    buf.dummy = size < this.size;
    buf.id = `${this._id}${this.nextId++}`;
    buf.refCount = 0;
    buf.ref = () => buf.refCount++;
    buf.unref = () => {
      if ( buf.refCount > 0 ) {
        buf.refCount--;
        if ( buf.refCount === 0 ) {
          setImmediate( self.releaseBuffer.bind( self, buf ) );
        }
      }
    };

    (buf.dummy ? this._dummyBuffers : this._freeBuffers)[buf.id] = buf;
    if ( !buf.dummy ) {
      this.count++;
    }
    return this.useBuffer( buf );
  }

  releaseBuffer( buf ) {
    if ( !(this._usedBuffers[buf.id] ||
           this._freeBuffers[buf.id] ||
           this._dummyBuffers[buf.id] ) ) {
      return this.emit( 'error', 'Can\'t release buffer that\'s not ours.' )
    }
    this.freeBuffer( buf );
  }

  freeBuffer( buf ) {
    buf.refCount = 0;
    if ( buf.dummy ) {
      delete this._dummyBuffers[buf.id];
    }
    else {
      delete this._usedBuffers[buf.id];
      this._freeBuffers[buf.id] = buf;
      buf.refCount = 0;
      this.emit( 'free' );
    }
  }

  getFreeBuffer() {
    let bufs = Object.values( this._freeBuffers );
    if ( bufs.length ) {
      return this.useBuffer( bufs[bufs.length - 1] );
    }
  }

  useBuffer( buf ) {
    if ( !buf.dummy ) {
      delete this._freeBuffers[buf.id];
      this._usedBuffers[buf.id] = buf;
    }
    buf.ref();
    return buf;
  }

  clear() {
    this._freeBuffers = {};
    this._usedBuffers = {};
    this._dummyBuffers = {};
  }

  freeAll() {
    for ( let buf of Object.values( this._usedBuffers ) ) {
      this.freeBuffer( buf );
    }
  }

  getBuffer( opts, cb ) {
    let self = this;

    if ( typeof opts === 'function' ) {
      cb = opts;
      opts = {};
    }

    let size = opts.size || this.size;
    let timeout = opts.timeout === undefined ? Infinity : opts.timeout;

    if ( typeof timeout !== 'number' || timeout < 0 ) {
      throw new Error( 'timeout must be a number >= 0' )
    }

    if ( typeof size !== 'number' || size <= 0 ) {
      throw new Error( 'size must be a positive integer' )
    }

    if ( typeof cb !== 'function' ) {
      throw new Error( 'callback must be a function' );
    }

    let _cb = ( buf ) => setImmediate( cb, buf );

    // smaller than our size, return a dummy buffer
    // or no free buffers and not yet at capacity, so alloc a new pooled buffer
    if ( size < this.size || (!this.free && this.count < this.capacity ) ) {
      return _cb( this.actuallyAlloc( size ) );
    }

    // if we have buffers, return most recently released buffer
    if ( this.free ) {
      return _cb( this.getFreeBuffer() );
    }

    // no buffer so far,
    // if no timeout specified, invoke callback immediately
    if ( timeout === 0 ) {
      return _cb( null );
    }

    let timer = null;
    let clearTimer = () => {
      if ( timer ) {
        clearTimeout( timer );
        timer = null;
      }
    };

    // listen for 'free' events and try grabbing a buffer
    // in case we don't get a buffer in case another listener
    // grabbed the last one, queue up another listener
    // until we get one, or a timeout kicks in and kills us
    let listener = () => self.getBuffer( ( buf ) => {
      if ( buf ) {
        clearTimer();
        return _cb( buf );
      }
      process.nextTick( () => self.once( 'free', listener ) )
    }, 0 );

    // actually listen for a free buffer
    this.once( 'free', listener );

    // if we timeout, remove the free listener and emit an error
    if ( timeout !== Math.Infinity ) {
      timer = setTimeout( () => {
        self.removeListener( 'once', listener );
        self.emit( 'error', new Error( 'timeout waiting for buffer in getBuffer()' ) );
      }, timeout );
    }
  }
}

module.exports = BufferPool;

