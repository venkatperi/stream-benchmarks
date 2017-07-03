const fapply = ( f, n, arg ) => f( n > 1 ? () => fapply( f, n - 1, arg ) : () => arg() );

module.exports = fapply;
