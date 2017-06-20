const Suite = require( './util/benchmark' );
const NullWriter = require( './stream/null_writer' );
const util = require( 'util' );
const fs = require( 'fs' );
const ReadStream = require( './stream/ReadStream' );

module.exports = ( options, cb ) => {

  if ( typeof(options) === 'function' ) {
    cb = options;
    options = undefined;
  }

  options = options || {};
  options.initialSize = options.initialSize || Math.pow( 2, 10 );
  options.maxSize = options.maxSize || Math.pow( 2, 17 );
  options.objectMode = options.objectMode || false;
  options.file = options.file || `${__dirname}/data/lorem.txt`;

  function create( len ) {
    let opts = {
      objectMode : options.objectMode,
      size : options.size,
      count : options.count
    };

    if ( options.bufPool ) {
      opts.bufPool = options.bufPool
    }

    if ( options.highWaterMark ) {
      hwm = options.highWaterMark;
      if ( typeof(hwm) === 'function' ) {
        hwm = hwm( len );
      }
      opts.highWaterMark = hwm;
    }

    let s = undefined;

    let setup = function () {
      // s = fs.createReadStream(options.file, opts);
    };

    let fn = ( done ) => {
      new ReadStream( options.file, opts )
          .pipe( new NullWriter( opts ) )
          .on( 'finish', done );
    };

    return [String( len ), fn, {setup : setup}];
  }

  let name = `file -> null (${util.inspect( options, {breakLength : Number.Infinity} )})`;
  let suite = new Suite( name );

  for ( let len = options.initialSize; len <= options.maxSize; len *= 2 ) {
    suite.add.apply( suite, create( len ) );
  }

  return suite.run();
}
;