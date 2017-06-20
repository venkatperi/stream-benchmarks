assert = require( 'assert' )
BufferPool = require( '../lib/util/BufferPool' )

size = 16 * 1024
count = 32

pool = undefined
describe 'BufferPool', ->

  beforeEach ->
    pool = new BufferPool( size, count )

  afterEach ->
    pool.clear( )

  it 'should not allocate buffers initially', ->
    assert pool.free is 0
    assert pool.used is 0

  it 'should allocate buffers', ->
    pool.alloc( )
    keys = Object.keys( pool._freeBuffers )
    assert pool.free is count
    buf = pool._freeBuffers[ keys[ 0 ] ]
    assert buf.length is size
    assert.notEqual buf.id, undefined

  it 'should get a buffer', ( done ) ->
    pool.getBuffer ( buf ) ->
      assert buf.length is size
      assert pool.free is count - 1
      assert pool.used is 1
      done( )

  it 'should release a buffer', ( done ) ->
    pool.getBuffer ( buf ) ->
      release = ->
        buf.unref( )
        done( )
      setTimeout release, 100

  it 'emit event when buffer is _freeBuffers', ( done ) ->
    pool.getBuffer ( buf ) ->
      pool.once 'free', done
      release = -> buf.unref( )
      setTimeout release, 100

  it 'if all buffers are _usedBuffers, getBuffer() should wait until a buffer is _freeBuffers', ( done ) ->
    next = ->
      pool.getBuffer ->
        return process.nextTick next if (pool.free > 1)

        pool.getBuffer ( buf ) ->
          assert pool.free is 0
          pool.getBuffer -> done( )
          release = -> buf.unref( )
          setTimeout release, 100

    next( )

  it 'if all buffers are _usedBuffers, getBuffer() should emit an error if no buffer is available within a specified timeout', ( done ) ->
    next = ->
      pool.getBuffer ->
        return process.nextTick next if (pool.free > 0)

        pool.on 'error', -> done( )

        pool.getBuffer ( buf ) ->
          done( new Error 'shouldn\'t get here' )
        , 100

        release = -> buf.unref( )
        setTimeout release, 500

    next( )

