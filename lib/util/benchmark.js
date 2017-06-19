const Benchmark = require( 'benchmark' );

defaultOptions = {
  defer : true
};

class Suite {
  constructor( name ) {
    this.suite = new Benchmark.Suite( name )
        .on( 'start', ( e ) => console.log( `${name}: starting` ) )
        .on( 'cycle', ( e ) => console.log( String( e.target ) ) )
        .on( 'error', ( e ) => {
          console.log( `${name}: ${e}` );
          this._rejectRun( e.target );
        } )
        .on( 'complete', ( e ) => {
          console.log( `${name}: done` );
          this._resolveRun( e.target );
        } );
  }

  on( event, handler ) {
    this.suite.on( event, handler );
    return this;
  }

  add( name, options, theTest ) {
    if ( typeof(options) === 'function' ) {
      theTest = options;
      options = undefined;
    }

    options = options || defaultOptions;

    let fn = ( d ) => {
      let done = () => d.resolve();
      theTest( done );
    };

    this.suite.add( name, fn, options );
    return this;
  }

  run( opts ) {
    this._rejectRun();
    return new Promise( ( resolve, reject ) => {
      this.runPromise = {resolve : resolve, reject : reject};
      this.suite.run( opts );
    } );
  }

  _resolveRun( e ) {
    if ( this.runPromise && this.runPromise.resolve ) {
      this.runPromise.resolve( e );
    }
    this.runPromise = undefined;
  }

  _rejectRun( e ) {
    if ( this.runPromise && this.runPromise.reject ) {
      this.runPromise.reject( e );
    }
    this.runPromise = undefined;
  }
}

module.exports = Suite;
