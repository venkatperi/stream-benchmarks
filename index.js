const readerToNull = require( './lib/reader_to_null' );

readerToNull( {type : 'string'} )
    .then( () => readerToNull( {type : 'buffer'} ) );