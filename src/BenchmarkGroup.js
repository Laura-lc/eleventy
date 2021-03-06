const chalk = require("chalk");

const Benchmark = require("./Benchmark");
const debugWarn = require("debug")("Eleventy:Warnings");

class BenchmarkGroup {
  constructor() {
    this.benchmarks = {};
    this.start = new Date();
    this.isVerbose = true;
    this.minimumThresholdMs = 0;
  }

  reset() {
    this.start = new Date();

    for (var type in this.benchmarks) {
      this.benchmarks[type].reset();
    }
  }

  // TODO use addAsync everywhere instead
  add(type, callback) {
    let benchmark = (this.benchmarks[type] = new Benchmark());

    return function(...args) {
      benchmark.before();
      let ret = callback.call(this, ...args);
      benchmark.after();
      return ret;
    };
  }

  // callback must return a promise
  async addAsync(type, callback) {
    let benchmark = (this.benchmarks[type] = new Benchmark());

    benchmark.before();
    // don’t await here.
    let promise = callback();
    promise.then(function() {
      benchmark.after();
    });
    return promise;
  }

  setMinimumThresholdMs(minimumThresholdMs) {
    let val = parseInt(minimumThresholdMs, 10);
    if (isNaN(val)) {
      throw new Error("`setMinimumThresholdMs` expects a number argument.");
    }
    this.minimumThresholdMs = val;
  }

  get(type) {
    this.benchmarks[type] = new Benchmark();
    return this.benchmarks[type];
  }

  finish(label, thresholdPercent, isVerbose) {
    let totalTimeSpent = new Date().getTime() - this.start.getTime();
    thresholdPercent = thresholdPercent !== undefined ? thresholdPercent : 10;
    for (var type in this.benchmarks) {
      let bench = this.benchmarks[type];
      let totalForBenchmark = bench.getTotal();
      let percent = (totalForBenchmark * 100) / totalTimeSpent;
      if (
        percent > thresholdPercent &&
        totalForBenchmark >= this.minimumThresholdMs
      ) {
        let timesCalledCount = bench.getTimesCalled();
        let timesCalled = "";
        if (timesCalledCount > 1) {
          timesCalled = `, called ${timesCalledCount}×`;
        }
        let str = chalk.yellow(
          `Benchmark (${label}): ${type} took ${bench.getTotal()}ms (${percent.toFixed(
            1
          )}%${timesCalled})`
        );
        if (isVerbose) {
          console.log(str);
        }

        debugWarn(str);
      }
    }
  }
}

module.exports = BenchmarkGroup;
