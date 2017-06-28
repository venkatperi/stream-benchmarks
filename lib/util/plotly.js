const Plotly = require( 'plotly' );
const yargs = require( 'yargs' );
const fs = require( 'fs' );
const _ = require( 'lodash' );

const args = yargs.options( {
  o : {
    alias : 'fileopt',
    choices : ['overwrite', 'extend', 'new'],
    default : 'overwrite'
  },
  n : {
    alias : 'name',
    string : true,
    required : true
  },
  u : {
    alias : 'username',
    default : process.env.PLOTLY_USERNAME
  },
  k : {
    alias : 'apikey',
    default : process.env.PLOTLY_APIKEY
  }
} )
  .help()
  .argv;

const plotly = Plotly( args.username, args.apikey );

var layout = {
  xaxis : {
    type : "log",
    autorange : true
  },
  yaxis : {
    autorange : true
  }
};

var graphOptions = {
  filename : args.name,
  fileopt : args.fileopt,
  layout : layout
};

function addName( obj, path = [] ) {
  _.forOwn( obj, ( v, k ) => {
    if ( !_.isEmpty( v ) && _.isObjectLike( v ) ) {
      v.path = path.join( ',' );
      v.name = k;

      if ( !v.hz ) {
        addName( v, path.concat( k ) );
      }
    }
  } );
  return obj;
}

function makeTraces( obj, opts ) {
  let res = [];
  _.forOwn( obj, ( v, k ) => {
    if ( !_.isEmpty( v ) && _.isObjectLike( v ) ) {
      if ( Object.values( v )[0].hz ) {
        let trace = _.extend( {name : `${v.path}:${v.name}`, x : [], y : []}, opts );
        _.forOwn( v, ( chunkSize, cKey ) => {
          if ( chunkSize.hz ) {
            trace.x.push( cKey.split( ' ' )[0] );
            trace.y.push( chunkSize.hz );
          }
        } );
        res.push( trace );
      }
      res.push( makeTraces( v ) );
    }
  } );
  return _.flatten( res );
}

fs.readFile( args._[0], 'utf8', ( err, data ) => {
  if ( err ) {
    throw (err);
  }

  data = JSON.parse( data );
  let root = data[Object.keys( data )[0]]; //root object

  addName( root );
  //console.log( root )
  let traces = makeTraces( root, {mode : 'lines+markers', type : 'scatter'} );

  plotly.plot( traces, graphOptions, function ( err, msg ) {
    if ( err ) {
      throw (err);
    }
    console.log( msg );
  } );
} );
