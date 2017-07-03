const util = require( 'util' );
const assert = require( 'assert' );
const _ = require( 'lodash' );
const GeneratorReader = require( '../lib/stream/generator_reader' );
const NullWriter = require( '../lib/stream/null_writer' );
const Generator = require( '../lib/util/Generator' );
const PassThrough = require( '../lib/stream/pass_through2' );

let options = {
  initialSize : Math.pow( 2, 11 ),
  maxSize : Math.pow( 2, 16 ),
  iter : 200,

};

const HWM = {
  'hwm=default' : () => undefined,
  'hwm=low' : ( x, objMode ) => objMode ? 2 : x / 2,
  'hwm=high' : ( x, objMode ) => objMode ? 2 : x * 2
};

const sourceType = ['string', 'buffer'];
const modeType = [false, true];

suite( 'passthrough', () => {
  modeType.forEach( ( objMode ) => suite( `objectMode=${objMode}`, () =>
    _.forOwn( HWM, ( hwm, hwmType ) => suite( hwmType, () => {
        if ( objMode && hwmType.indexOf( 'default' ) < 0 ) {
          return;
        }
        sourceType.forEach( ( type ) => suite( `source=${type}`, () => {

          for ( let passes = 0; passes <= 5; passes++ ) {
            suite( `passes=${passes}`, () => {
              for ( let len = options.initialSize; len <= options.maxSize; len *= 2 ) {
                let data = null;
                let iter = options.iter;

                // Allocate the buffer outside the test function.
                // For large buffer sizes, the time for memory allocation can skew test results
                beforeEach( () => data = type === 'string'
                  ? _.padEnd( '', len ) : Buffer.allocUnsafe( len ) );

                bench( `${len} x ${iter}`, {attr : {x : len}}, ( done ) => {
                  let opts = {
                    generator : Generator.itemByCountIterator( data, iter ),
                    highWaterMark : hwm( len, objMode ),
                    objectMode : objMode
                  };
                  let src = new GeneratorReader( opts );
                  src.pause();

                  let s = src;
                  for ( let i = 0; i < passes; i++ ) {
                    s = s.pipe( new PassThrough( opts ) );
                  }
                  let w = s.pipe( new NullWriter( opts ) )
                    .on( 'finish', () => {
                      assert.equal( w.count, iter * len );
                      done();
                    } );
                  src.resume();
                } );
              }
            } );
          }
        } ) )
      }
    ) ) ) );
} );

