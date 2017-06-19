fs = require 'fs'
path = require 'path'
stringify = require 'json-stringify-safe'

module.exports = (opts= {}) ->
  file : ( f ) -> fs.readFileSync path.join(__dirname,
    '../fixtures', "#{f}.#{{opts.ext}}"), 'utf8'
  log : ( s ) -> console.log stringify s, null, 2
