const Suite = require( './benchmark/suite' );
const NullWriter = require( './stream/null_writer' );
const util = require( 'util' );
const fs = require( 'fs' );
const ReadStream = require( './stream/ReadStream2' );
const result = require( './util/result' );
const _ = require( 'lodash' );

module.exports = ( options, cb ) => {

  if ( typeof(options) === 'function' ) {
    cb = options;
    options = undefined;
  }

  options = _.extend( {},
    {
      initialSize : Math.pow( 2, 10 ),
      maxSize : Math.pow( 2, 17 ),
      objectMode : false,
      file : `${__dirname}/data/lorem.txt`
    }, options );

  function create( len ) {
    let opts = _.pick( options, ['objectMode', 'size', 'count'] );
    opts.highWaterMark = result( options.highWaterMark, len );

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
