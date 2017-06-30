const minSize = Math.pow( 2, 10 );
const maxSize = Math.pow( 2, 25 );

suite( 'buffer allocation', () => {
  for ( let size = minSize; size <= maxSize; size *= 2 ) {
    bench( size, () => Buffer.allocUnsafe( size ) );
  }
} );

