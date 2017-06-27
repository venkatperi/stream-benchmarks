# benchmarking nodejs streams

### Reproducing Tests
To reproduce the tests:
1. Clone this repository
```bash
$ git clone https://github.com/venkatperi/stream-benchmarks
```

2. Install `bench-runner`
```bash
$ npm install -g bench-runner
```


### Memory Streaming Performance
#### Test: Write 1GiB in varying chunk sizes to `null`

To reproduce this test, run:
```bash
$ bench-runner -g ".*(default|high|low).*false.*buffer"
```

We want to see the effect of chunk size on streams operating in regular (not `objectMode`) mode. A `memory reader` is configured to push chunks of 2KiB through 128KiB to a `null writer`. Chunks are encoded as `buffers` to avoid any conversion overhead.

![mem to null](https://raw.githubusercontent.com/venkatperi/stream-benchmarks/master/img/mem-to-null.png)

We also vary the `highWaterMark` to see it's effect on stream performance:
* `default`: Use the default `highWaterMark` (16KiB)
* `low`: Force the `highWaterMark` to be always lower than the chunk size
* `high`: Force the `highWaterMark` to be always higher than the chunk size

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
