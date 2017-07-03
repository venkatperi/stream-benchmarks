const fnapply = require( '../lib/util/fnapply' );

// f1 = ( done ) => process.nextTick( done );
// f2 = ( done ) => process.nextTick( f1, done );
// f3 = ( done ) => process.nextTick( f2, done );

const maxCount = 10;

suite( 'nextTick', () => {
  for ( let count = 1; count <= maxCount; count++ ) {
    bench( count, {attr : {x : count}}, ( done ) => fnapply( process.nextTick, count, done ) );
  }
} );

suite( 'setImmediate', () => {
  for ( let count = 1; count <= maxCount; count++ ) {
    bench( count, {attr : {x : count}}, ( done ) => fnapply( setImmediate, count, done ) );
  }
} );




