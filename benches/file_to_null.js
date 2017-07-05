const ReadStream = require( '../lib/stream/ReadStream' );
const NullWriter = require( '../lib/stream/null_writer' );
const fs = require( 'fs' );

const file = __dirname + '/../lib/data/lorem.txt';

suite( 'file -> null', () => {

  bench( 'using Buffer pool', ( done ) => {
    new ReadStream( file )
      .pipe( new NullWriter(  ) )
      .on( 'finish', done );
  } );

  bench( 'using default reader', ( done ) => {
    fs.createReadStream( file )
      .pipe( new NullWriter(  ) )
      .on( 'finish', done );
  } );
} );
