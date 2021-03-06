// Copyright 2017, Venkat Peri.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

const fs = require( 'fs' );
const util = require( 'util' );
const Readable = require( 'stream' ).Readable;

const kMinPoolSpace = 128;


var pool;

function allocNewPool( poolSize ) {
  pool = pool || Buffer.allocUnsafe( poolSize );
  pool.used = 0;
}

function getPathFromURL( path ) {
  return path;
}

util.inherits( ReadStream, Readable );

function ReadStream( path, options ) {
  if ( !(this instanceof ReadStream) ) {
    return new ReadStream( path, options );
  }

  // a little bit bigger buffer and water marks by default
  options = copyObject( getOptions( options, {} ) );
  if ( options.highWaterMark === undefined ) {
    options.highWaterMark = 64 * 1024;
  }

  Readable.call( this, options );

  handleError( (this.path = getPathFromURL( path )) );
  this.fd = options.fd === undefined ? null : options.fd;
  this.flags = options.flags === undefined ? 'r' : options.flags;
  this.mode = options.mode === undefined ? 0o666 : options.mode;

  this.start = options.start;
  this.end = options.end;
  this.autoClose = options.autoClose === undefined ? true : options.autoClose;
  this.pos = undefined;
  this.bytesRead = 0;

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

  if ( !pool || pool.length - pool.used < kMinPoolSpace ) {
    // discard the old pool.
    allocNewPool( this._readableState.highWaterMark );
  }

  // Grab another reference to the pool in the case that while we're
  // in the thread pool another read() finishes up the pool, and
  // allocates a new one.
  var thisPool = pool;
  var toRead = Math.min( pool.length - pool.used, n );
  var start = pool.used;

  if ( this.pos !== undefined ) {
    toRead = Math.min( this.end - this.pos + 1, toRead );
  }

  // already read everything we were supposed to read!
  // treat as EOF.
  if ( toRead <= 0 ) {
    return this.push( null );
  }

  // the actual read.
  var self = this;
  fs.read( this.fd, pool, pool.used, toRead, this.pos, onread );

  // move the pool positions, and internal position for reading.
  if ( this.pos !== undefined ) {
    this.pos += toRead;
  }
  pool.used += toRead;

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
        b = thisPool.slice( start, start + bytesRead );
      }

      self.push( b );
    }
  }
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

