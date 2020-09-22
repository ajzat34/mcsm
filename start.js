exports.command = ['start <target>'];

exports.describe = 'Start a server (non-interactive)';

exports.builder = {
};

const ora = require('ora');

exports.handler = async function(argv) {
  const data = require('./store.js');
  store = await data.getLocalStorage();
  const {Process} = await require('./run.js').open(store);
  const target = argv.target;
  const proc = new Process(require('./find')(store, target));
  const spinner = ora(`Starting "${proc.server.name}"`).start();
  await proc.run(false);
  setTimeout(async ()=>{
    spinner.text = `Server "${proc.server.name}" is loading`;
    spinner.succeed();
    await require('./list').handler();
    process.exit(0);
  }, 500);
};
