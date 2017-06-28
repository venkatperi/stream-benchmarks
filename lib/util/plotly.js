const Plotly = require('plotly')
const yargs = require('yargs')
const fs = require('fs')
const _ = require('lodash')

const args = yargs.options({
    u: {
      alias: 'username',
      default: process.env.PLOTLY_USERNAME
    },
    k: {
      alias: 'apikey',
      default: process.env.PLOTLY_APIKEY
    }
  })
  .help()
  .argv;

const plotly = Plotly(args.username, args.apikey);

var layout = {
  xaxis: {
    type: "log",
    autorange: true
  },
  yaxis: {
    type: "log",
    autorange: true
  }
}

var graphOptions = {
  filename: "benchmarks",
  fileopt: "overwrite",
  layout: layout
};


function addName(obj) {
  _.forOwn(obj, (v,k) => {
    if (_.isEmpty(v) || !_.isObjectLike(v)) return;
    v.name = k;
    if (!v.hz)
      addName(v);
  })
  return obj;
}

fs.readFile(args._[0], 'utf8', (err, data) => {
  if (err) throw (err);

  data = JSON.parse(data);
  let root = data[Object.keys(data)[0]]; //root object

  addName(root);
  
  let traces = [];
  _.forOwn(root, (hwm, hwmKey) => {
    let hwmName = hwmKey.split(' ')[0];
    _.forOwn(hwm, (objMode, objModeKey) => {
      let objModeName = Boolean(objModeKey.split(' ')[1]);
      if (objModeName) return;
      _.forOwn(objMode, (type, typeKey) => {
        if (typeKey !== 'buffer source') return;
        let trace = {
          name: `${hwmName}:${objModeName}`,
          x: [],
          y: [],
          mode: 'lines+markers',
          type: 'scatter'
        };
        _.forOwn(type, (chunkSize, cKey) => {
          trace.x.push(cKey.split(' ')[0]);
          trace.y.push(chunkSize.hz);
        });
        traces.push(trace);
        console.log(trace);
      });
    });
  });

  plotly.plot(traces, graphOptions, function(err, msg) {
    if (err) throw (err);
    console.log(msg);
  });
});
