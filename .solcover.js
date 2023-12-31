module.exports = {
  istanbulReporter: ["html", "lcov"],
  skipFiles: ["test"],
  configureYulOptimizer: true,
  solcOptimizerDetails: {
    yul: true,
    yulDetails: {},
  },
};
