const ReadStream = require( '../lib/stream/ReadStream' );
const NullWriter = require( '../lib/stream/null_writer' );
const fs = require( 'fs' );

const file = __dirname + '/../lib/data/lorem.txt';

suite( 'file -> null', () => {

  const delays = [0, 1, 10];

  for ( let delay of delays ) {
    suite( `write delay: ${delay}ms`, () => {
      bench( 'using Buffer pool', ( done ) => {
        new ReadStream( file )
          .pipe( new NullWriter( {delay : delay} ) )
          .on( 'finish', done );
      } );

      bench( 'using default reader', ( done ) => {
        fs.createReadStream( file )
          .pipe( new NullWriter( {delay : delay} ) )
          .on( 'finish', done );
      } );
    } );
  }

} );
