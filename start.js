exports.command = ['start <target>'];

exports.describe = 'Start a server (non-interactive)';

exports.builder = {
};

exports.handler = async function(argv) {
  const data = require('./store.js');
  store = await data.getLocalStorage();
  const {Process} = await require('./run.js').open(store);
  const target = argv.target;
  const proc = new Process(require('./find')(store, target));
  await proc.run(false);
  setTimeout(async ()=>{
    await require('./list').handler();
    process.exit(0);
  }, 500);
};
