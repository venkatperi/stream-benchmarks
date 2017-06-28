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

let options = {
  initialSize : Math.pow( 2, 11 ),
  maxSize : Math.pow( 2, 17 ),
  iter : 200,

};

const HWM = {
  'default HWM' : () => undefined,
  'low HWM' : ( x ) => x - 10,
  'high HWM' : ( x ) => x + 10
};

const sourceType = ['string', 'buffer'];
const modeType = [false, true];

const totalSize = Math.pow( 2, 30 );

suite( `write ${bytes( totalSize )} from memory to null`, () => {

  _.forOwn( HWM, ( hwm, hwmType ) => suite( hwmType, () =>
    modeType.forEach( ( objMode ) => suite( `objectMode ${objMode}`, () =>
      sourceType.forEach( ( type ) => suite( `${type} source`, () => {

        for ( let len = options.initialSize; len <= options.maxSize; len *= 2 ) {
          let data = null;
          let iter = totalSize / len;

          // Allocate the buffer outside the test function.
          // For large buffer sizes, the time for memory allocation can skew test results
          beforeEach( () => data = type === 'string'
            ? _.padEnd( '', len ) : Buffer.allocUnsafe( len ) );

          bench( `${bytes( len )} x ${iter}`, ( done ) => {
            let opts = {
              generator : Generator.itemByCountIterator( data, totalSize / len ),
              highWaterMark : hwm( len ),
              objectMode: objMode
            };
            let w = new GeneratorReader( opts )
              .pipe( new NullWriter( opts ) )
              .on( 'finish', () => {
                assert.equal( w.count, totalSize );
                done();
              } );
          } );
        }
      } ) )
    ) ) ) );
} );

