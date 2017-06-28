const util = require( 'util' );
const numeral = require( 'numeral' );
const assert = require( 'assert' );
const _ = require( 'lodash' );
const GeneratorReader = require( '../lib/stream/generator_reader' );
const NullWriter = require( '../lib/stream/null_writer' );
const Generator = require( '../lib/util/Generator' );

function bytes( x ) {
  return x;
  return numeral( x ).format( '0ib' )
}

let testType = {
  'test=fixed size' : ( x ) => totalSize / x,
  'test=fixed iter' : () => options.iter,
};

let options = {
  initialSize : Math.pow( 2, 11 ),
  maxSize : Math.pow( 2, 16 ),
  iter : 200,

};

const HWM = {
  'hwm=default' : () => undefined,
  'hwm=low' : ( x, objMode ) => objMode ? 16 : x / 2,
  'hwm=high' : ( x, objMode ) => objMode ? 16 : x * 2
};

const sourceType = ['string', 'buffer'];
const modeType = [false, true];

const totalSize = Math.pow( 2, 30 );

_.forOwn( testType, ( test, testName ) =>
  suite( testName, () => {

    modeType.forEach( ( objMode ) => suite( `objectMode=${objMode}`, () =>
      _.forOwn( HWM, ( hwm, hwmType ) => suite( hwmType, () => {
          if ( objMode && hwmType.indexOf( 'default' ) < 0 ) {
            return;
          }
          sourceType.forEach( ( type ) => suite( `source=${type}`, () => {

            for ( let len = options.initialSize; len <= options.maxSize; len *= 2 ) {
              let data = null;
              let iter = test(len);

              // Allocate the buffer outside the test function.
              // For large buffer sizes, the time for memory allocation can skew test results
              beforeEach( () => data = type === 'string'
                ? _.padEnd( '', len ) : Buffer.allocUnsafe( len ) );

              bench( `${bytes( len )} x ${iter}`, ( done ) => {
                let opts = {
                  generator : Generator.itemByCountIterator( data, iter ),
                  highWaterMark : hwm( len, objMode ),
                  objectMode : objMode
                };
                let w = new GeneratorReader( opts )
                  .pipe( new NullWriter( opts ) )
                  .on( 'finish', () => {
                    assert.equal( w.count, iter * len );
                    done();
                  } );
              } );
            }
          } ) )
        }
      ) ) ) );
  } ) );

