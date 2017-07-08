const debug = require( 'debug' )( 'ReadStream' );
const fs = require( 'fs' );
const util = require( 'util' );
const Readable = require( 'stream' ).Readable;
const BufferPool = require( '../util/BufferPool' );
require( '../util/buffer_pool_patch' );

util.inherits( ReadStream, Readable );

var bufPool = null;

function ReadStream( path, options ) {
  if ( !(this instanceof ReadStream) ) {
    return new ReadStream( path, options );
  }

  options = copyObject( getOptions( options, {} ) );

  Readable.call( this, options );

  this.path = path;
  this.fd = options.fd === undefined ? null : options.fd;
  this.flags = options.flags === undefined ? 'r' : options.flags;
  this.mode = options.mode === undefined ? 0o666 : options.mode;

  this.start = options.start;
  this.end = options.end;
  this.autoClose = options.autoClose === undefined ? true : options.autoClose;
  this.pos = undefined;
  this.bytesRead = 0;

  this.bufferSize = options.size || 1024 * 1024;
  this.bufferCount = options.count || 8;

  if ( this.start !== undefined ) {
    if ( typeof this.start !== 'number' ) {
      throw new TypeError( '"start" option must be a Number' );
    }
    if ( this.end === undefined ) {
      this.end = Infinity;
    } else if ( typeof this.end !== 'number' ) {
      throw new TypeError( '"end" option must be a Number' );
    }

    if ( this.start > this.end ) {
      throw new Error( '"start" option must be <= "end" option' );
    }

    this.pos = this.start;
  }

  if ( bufPool ) {
    this.bufPool = bufPool;
    bufPool.freeAll();
  } else {
    bufPool = this.bufPool = new BufferPool( this.bufferSize, this.bufferCount );
    this.bufPool.alloc();
  }

  if ( typeof this.fd !== 'number' ) {
    this.open();
  }

  this.on( 'end', function () {
    if ( this.autoClose ) {
      this.destroy();
    }
  } );
}

ReadStream.prototype.open = function () {
  var self = this;
  fs.open( this.path, this.flags, this.mode, function ( er, fd ) {
    if ( er ) {
      if ( self.autoClose ) {
        self.destroy();
      }
      self.emit( 'error', er );
      return;
    }

    self.fd = fd;
    self.emit( 'open', fd );
    // start the flow of data.
    self.read();
  } );
};

ReadStream.prototype._read = function ( n ) {

  if ( typeof this.fd !== 'number' ) {
    return this.once( 'open', function () {
      this._read( n );
    } );
  }

  if ( this.destroyed ) {
    return;
  }

  // the actual read.
  var self = this;
  this.bufPool.getBuffer( function ( buf ) {
    var toRead = buf.length;

    fs.read( self.fd, buf, 0, toRead, self.pos, onread );

    // move the pool positions, and internal position for reading.
    if ( self.pos !== undefined ) {
      self.pos += toRead;
    }

    function onread( er, bytesRead ) {
      if ( er ) {
        if ( self.autoClose ) {
          self.destroy();
        }
        self.emit( 'error', er );
      } else {
        var b = null;
        if ( bytesRead > 0 ) {
          self.bytesRead += bytesRead;
          b = buf;
        }

        self.push( b );

        // safe to unref since we've monkey patched Readable.prototype.push()
        if ( self.__push__ && b && typeof b.unref === 'function' ) {
          b.unref();
        }
      }
    }
  } );
};

ReadStream.prototype._destroy = function ( err, cb ) {
  this.close( function ( err2 ) {
    cb( err || err2 );
  } );
};

ReadStream.prototype.close = function ( cb ) {
  if ( cb ) {
    this.once( 'close', cb );
  }

  if ( this.closed || typeof this.fd !== 'number' ) {
    if ( typeof this.fd !== 'number' ) {
      this.once( 'open', closeOnOpen );
      return;
    }
    return process.nextTick( () => this.emit( 'close' ) );
  }

  this.closed = true;

  fs.close( this.fd, ( er ) => {
    if ( er ) {
      this.emit( 'error', er );
    } else {
      this.emit( 'close' );
    }
  } );

  this.fd = null;
};

// needed because as it will be called with arguments
// that does not match this.close() signature
function closeOnOpen( fd ) {
  this.close();
}

ReadStream.prototype.destroy = function destroy( err, cb ) {
  const readableDestroyed = this._readableState &&
                            this._readableState.destroyed;
  const writableDestroyed = this._writableState &&
                            this._writableState.destroyed;

  if ( readableDestroyed || writableDestroyed ) {
    if ( cb ) {
      cb( err );
    } else if ( err &&
                (!this._writableState || !this._writableState.errorEmitted) ) {
      process.nextTick( emitErrorNT, this, err );
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if ( this._readableState ) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if ( this._writableState ) {
    this._writableState.destroyed = true;
  }

  this._destroy( err || null, ( err ) => {
    if ( !cb && err ) {
      process.nextTick( emitErrorNT, this, err );
      if ( this._writableState ) {
        this._writableState.errorEmitted = true;
      }
    } else if ( cb ) {
      cb( err );
    }
  } );

  return this;
};

function copyObject( source ) {
  var target = {};
  for ( var key in source ) {
    target[key] = source[key];
  }
  return target;
}

function getOptions( options, defaultOptions ) {
  if ( options === null || options === undefined ||
       typeof options === 'function' ) {
    return defaultOptions;
  }

  if ( typeof options === 'string' ) {
    defaultOptions = util._extend( {}, defaultOptions );
    defaultOptions.encoding = options;
    options = defaultOptions;
  } else if ( typeof options !== 'object' ) {
    throw new TypeError( '"options" must be a string or an object, got ' +
                         typeof options + ' instead.' );
  }

  //if (options.encoding !== 'buffer')
  //assertEncoding(options.encoding);
  return options;
}

function handleError( val, callback ) {
  if ( val instanceof Error ) {
    if ( typeof callback === 'function' ) {
      process.nextTick( callback, val );
      return true;
    } else {
      throw val;
    }
  }
  return false;
}

module.exports = ReadStream;

