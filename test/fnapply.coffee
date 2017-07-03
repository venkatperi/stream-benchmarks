assert = require 'assert'
fnapply = require '../lib/util/fnapply'

describe 'fnapply', ->

#  it 'apply n times', ->
#    f = ( x ) ->
#      console.log "f(#{x})"
#      x + 1
#    assert.equal fnapply(f, 1, 1), 2
#    assert.equal fnapply(f, 2, 1), 3

  it 'with nextTick', (done) ->
    f = ( x ) ->
      console.log "f()"
      process.nextTick(x)
    fnapply f, 2, done

