# benchmarking nodejs streams

### Memory Streaming Performance
#### Test: Write 1GiB in varying chunk sizes to `null`
![mem to null]()
![Image](https://plot.ly/~venkatperi/42.png?share_key=awtG8lMNLpAIYNFjVJtAvC")


### About the Tests
#### benchmark.js
We use [`benchmark.js`](http://www.benchmarkjs.com) with a mocha-like runner
[`bench-runner`](https://www.npmjs.com/package/bench-runner).

#### Null Writer
The `null writer` is a `Writable` stream which accepts chunks and does nothing with them.
```javascript
NullWriter.prototype._write = function ( chunk, enc, cb ) {
  if ( chunk ) {
    this.count += chunk.length;
  }
  if ( this.delay ) {
    return setTimeout( cb, this.delay );
  }
  cb();
};
```

#### Memory Reader
The `memory reader` is a `Readable` stream which uses a generator/iterator to push chunks of memory resident data. The generators used here return the same memory chunk for every call to `next()` to avoid the overhead of allocating memory.

```javascript
function next( stream ) {
  var next = stream._generator.next();
  return stream.push( next.done ? null : next.value );
}

GeneratorReader.prototype._read = function ( n ) {
  while ( next( this ) ) {}
};
```
