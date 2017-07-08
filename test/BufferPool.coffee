assert = require( 'assert' )
BufferPool = require( '../lib/util/BufferPool' )

size = 16 * 1024 * 1024
pool = undefined

maxItOut = ( cb ) ->
  next = ->
    pool.getBuffer ( buf ) ->
      return process.nextTick next if (pool.count < pool.capacity)
      cb( buf )

  next( )

describe 'BufferPool', ->

  beforeEach ->
    pool = new BufferPool( )

  afterEach ->
    pool.clear( )

  it 'has defaults', ->
    assert pool.size != undefined
    assert pool.capacity != undefined

  it 'should not allocate buffers initially', ->
    assert pool.free is 0
    assert pool.dummies is 0
    assert pool.used is 0
    assert pool.count is 0

  describe 'dummy buffer', ->

    it 'allocate a dummy buffer', ( done ) ->
      pool.getBuffer size : 4000, ( buf ) ->
        assert buf.dummy is true
        assert buf.length is 4000
        assert pool.dummies is 1
        assert pool.free is 0
        assert pool.used is 0
        assert pool.count is 0
        done( )

    it 'free dummy buffer', ( done ) ->
      pool.getBuffer size : 4000, ( buf ) ->
        verify = ->
          assert pool.dummies is 0
          done( )

        release = ->
          buf.unref( )
          setTimeout verify, 100

        setTimeout release, 100

  describe 'pooled buffer', ->

    it 'default size is pool size', ( done ) ->
      pool.getBuffer ( buf ) ->
        assert buf.length is pool.size
        done( )

    it 'allocate', ( done ) ->
      pool.getBuffer ( buf ) ->
        assert buf.dummy is false
        assert pool.dummies is 0
        assert pool.free is 0
        assert pool.used is 1
        assert pool.count is 1
        done( )

    it 'release', ( done ) ->
      pool.getBuffer ( buf ) ->
        verify = ->
          assert pool.free is 1
          assert pool.used is 0
          assert pool.count is 1
          done( )

        release = ->
          buf.unref( )
          setTimeout verify, 100

        setTimeout release, 100

    it 'emit event when buffer is freed', ( done ) ->
      pool.getBuffer ( buf ) ->
        pool.once 'free', done
        release = -> buf.unref( )
        setTimeout release, 100

    describe 'pool at capacity', ->

      it 'getBuffer() should return null if timeout is 0', ( done ) ->
        pool.on 'error', done
        maxItOut ->
          pool.getBuffer timeout : 0, ( buf ) ->
            assert buf is null
            done( )

      it 'getBuffer() should return buffer if one is free within a specified timeout', ( done ) ->
        pool.on 'error', done

        maxItOut ( buf ) ->
          pool.getBuffer timeout : 500, ( buf2 ) ->
            assert buf2 isnt null
            done( )

          release = -> buf.unref( )
          setTimeout release, 200

      it 'getBuffer() should emit an error if no buffer is available within a specified timeout', ( done ) ->

        maxItOut ( buf ) ->
          pool.on 'error', -> done( )

          pool.getBuffer timeout : 200, ->
            done new Error "shouldn't get here!"

          release = -> buf.unref( )
          setTimeout release, 1000


