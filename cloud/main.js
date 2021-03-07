const { initParse } = require("./init");
// const {generateBeforeSaveTrigger,initParse} = require('./init')

runCloud();
async function runCloud() {
  await initParse();
  require("./runTrigger");
}