const Suite = require( './util/benchmark' );
const _ = require( 'lodash' );
const GeneratorReader = require( './stream/generator_reader' );
const NullWriter = require( './stream/null_writer' );
const Generator = require( './util/Generator' );
const util = require('util');

module.exports = ( options, cb ) => {

  if ( typeof(options) === 'function' ) {
    cb = options;
    options = undefined;
  }

  options = options || {};
  options.initialSize = options.initialSize || Math.pow( 2, 10 );
  options.maxSize = options.maxSize || Math.pow( 2, 17 );
  options.iter = options.iter || 200;
  options.type = options.type || 'buffer';
  options.objectMode = options.objectMode || false;

  function test( len ) {
    const data = options.type === 'string' ? _.padEnd( '', len ) : new Buffer( len );

    return ( done ) => {
      let opts = {
        generator : Generator.itemByCountIterator( data, options.iter ),
        objectMode : options.objectMode
      };

      if ( options.highWaterMark ) {
        hwm = options.highWaterMark;
        if ( typeof(hwm) === 'function' ) {
          hwm = hwm( len );
        }
        opts.highWaterMark = hwm;
      }

      new GeneratorReader( opts )
          .pipe( new NullWriter( opts ) )
          .on( 'finish', done );
    }
  }

  let name = `${options.type} -> null (${util.inspect(options, {breakLength: Number.Infinity})})`;
  let suite = new Suite(name); 

  for ( let len = options.initialSize; len <= options.maxSize; len *= 2 ) {
    suite.add( `${len}x${options.iter}`, test( len ) );
  }

  return suite.run();
};