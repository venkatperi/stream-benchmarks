# benchmarking nodejs streams

### Reproducing Tests
To reproduce the tests:

Install `bench-runner`
```bash
$ npm install -g bench-runner

```

Clone this repository
```bash
$ git clone https://github.com/venkatperi/stream-benchmarks
$ cd stream-benchmarks
$ bench-runner <options>
```

## Bigger is Better with Chunk Size & `highWaterMark` is a Killjoy

To reproduce:
```bash
$ bench-runner -g ".*(default|high|low).*false.*buffer"
```

We want to see the effect of chunk size on streams operating in regular (not `objectMode`) mode. A `memory reader` is configured to push 1GiB in chunks of 2KiB through 128KiB to a `null writer`. Chunks are encoded as `buffers` to avoid any conversion overhead.

![mem to null](https://raw.githubusercontent.com/venkatperi/stream-benchmarks/master/img/mem-to-null.png)

We also vary the `highWaterMark` to see it's effect on stream performance:
* `default`: Use the default `highWaterMark` (16KiB)
* `low`: Force the `highWaterMark` to be always lower than the chunk size
* `high`: Force the `highWaterMark` to be always higher than the chunk size

![Image](https://plot.ly/~venkatperi/42.png?share_key=awtG8lMNLpAIYNFjVJtAvC")

Here's what we can see in the above graph:
* Performance is best when chunk sizes are smaller than the `highWaterMark` (`high` plot).
* Likewise, chunk sizes larger than the `highWaterMark`  result in lower performance (`low`).
* The `default` plot has an inflection point around the default `highWaterMark` of 16KiB.

### Thoughts
It would seem that the hit in performance is a result of the `streams` API trying to play nice and providing downstream components with the number of bytes they requested. Looking under the hood, the following snippet from [\_stream_readable.js](https://github.com/nodejs/readable-stream/blob/master/lib/_stream_readable.js) is responsible the decision to provide a `slice` (fast, for when `highWaterMark` > chunk) or concatenate multiple buffers (slow, for when `highWaterMark` < chunk):
```javascript
// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}
```

## About the Tests
### benchmark.js
We use [`benchmark.js`](http://www.benchmarkjs.com) with a mocha-like runner
[`bench-runner`](https://www.npmjs.com/package/bench-runner).

### Null Writer
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

### Memory Reader
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
