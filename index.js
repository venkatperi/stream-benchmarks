//const runner = require( './lib/reader_to_null' );
const runner = require( './lib/file_to_null' );

const tests = [
  //{type: 'buffer', objectMode: true},
  //,{type: 'string', objectMode: false}
  //{type: 'buffer', objectMode: true, highWaterMark: 64}
  {objectMode: true, size: 1024 * 1024, count: 3, initialSize: 1024, maxSize: 1024,
    highWaterMark: 200}
  //,{type: 'string', objectMode: true}
];

let p = Promise.resolve();
for (let opts of tests) {
  p = p.then( () => runner( opts ) );
}