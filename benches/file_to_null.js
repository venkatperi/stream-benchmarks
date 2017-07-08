const ReadStream = require( '../lib/stream/ReadStream' );
const NullWriter = require( '../lib/stream/null_writer' );
const fs = require( 'fs' );
const tmp = require( 'tmp' );

const minSize = 1024;
const maxSize = 1024 * 1024 * 1024;
let fileNames = {};

suite( 'file -> null', () => {

  before( () => {
    for ( let size = minSize; size <= maxSize; size *= 2 ) {
      let name = fileNames[size] = tmp.tmpNameSync();
      let buf = Buffer.allocUnsafe( size );
      fs.writeFileSync( name, buf );
      // console.log( `${size}: ${name}` );
    }
  } );

  after( () => {
    for ( let size = minSize; size <= maxSize; size *= 2 ) {
      fs.unlinkSync( fileNames[size] );
    }
  } );

  suite( 'simulated buffer pool', () => {
    for ( let size = minSize; size <= maxSize; size *= 2 ) {
      bench( size, {attr : {x : size}}, ( done ) => {
        new ReadStream( fileNames[size] )
          .pipe( new NullWriter() )
          .on( 'finish', done );
      } );
    }
  } );

  suite( 'fs.createReadStream', () => {
    for ( let size = minSize; size <= maxSize; size *= 2 ) {
      bench( size, {attr : {x : size}}, ( done ) => {
        fs.createReadStream( fileNames[size] )
          .pipe( new NullWriter() )
          .on( 'finish', done );
      } );
    }
  } );

} );
