const util = require( 'util' );
const assert = require( 'assert' );
const _ = require( 'lodash' );
const GeneratorReader = require( '../../lib/stream/generator_reader' );
const NullWriter = require( '../../lib/stream/null_writer' );
const Generator = require( '../../lib/util/Generator' );

let options = {
  initialSize : Math.pow( 2, 10 ),
  maxSize : Math.pow( 2, 27 ),
  iter : 200,
  objectMode : false
};

function fn( opts ) {
  return ( done ) =>
    new GeneratorReader( opts )
      .pipe( new NullWriter( opts ) )
      .on( 'finish', done );
}

function getOpts( opts ) {
  let data = opts.type === 'string' ? _.padEnd( '', opts.len ) : Buffer.allocUnsafe( opts.len );
  return {
    generator : Generator.itemByCountIterator( data, options.iter ),
    objectMode : typeof opts.objectMode === 'undefined' ? false : opts.objectMode,
    highWaterMark : opts.highWaterMark
  };
}

module.exports = {
  getOpts : getOpts
};
