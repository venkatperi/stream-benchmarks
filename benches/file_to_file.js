const ReadStream = require( '../lib/stream/ReadStream' );
const NullWriter = require( '../lib/stream/null_writer' );
const fs = require( 'fs' );
const tmp = require( 'tmp' );
const {compare} = require( 'file-compare' );

const file = __dirname + '/../lib/data/lorem.txt';

function comp( f1, f2, cb ) {
  compare( f1, f2, ( ok, err ) => {
    if ( err ) {
      throw err;
    }
    if ( !ok ) {
      throw new Error( `files are different: ${f1}, ${f1}` );
    }
    done();
  } );
}

suite( 'readFile', () => {

  let tempFile = null;

  beforeEach( () => tempFile = tmp.tmpNameSync() );

  afterEach( () => fs.unlinkSync( tempFile ) );

  bench( 'using Buffer pool', ( done ) => {
    new ReadStream( file, {bufferSize : 16 * 1024} )
      .pipe( fs.createWriteStream( tempFile, 'utf8' ) )
      .on( 'close', done );
  } );

  bench( 'using default reader', ( done ) => {
    fs.createReadStream( file )
      .pipe( fs.createWriteStream( tempFile ) )
      .on( 'close', done );
  } );
} );
