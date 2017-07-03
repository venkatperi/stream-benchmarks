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
  autosize : false,
  width : 800,
  height : 600,
  margin : {l : 50, r : 0, t : 0, b : 50, pad : 0},
  showlegend : true,
  xaxis : {
    type : "log",
    autorange : true,
    title : "chunk size (bytes)"
  },
  yaxis : {
    type : "log",
    autorange : true,
    title : "performance (ops/s)"
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

let fileName = args._[0];
fileName = fileName === undefined ? '/dev/stdin' : fileName;

fs.readFile( fileName, 'utf8', ( err, data ) => {
  if ( err ) {
    throw (err);
  }

  // let root = data = JSON.parse( data );
  // addName( root );
  // let traces = makeTraces( root, {mode : 'lines+markers', type : 'scatter'} );

  let traces = JSON.parse( data );
  plotly.plot( traces, graphOptions, function ( err, msg ) {
    if ( err ) {
      throw (err);
    }
    console.log( msg );
  } );
} );
