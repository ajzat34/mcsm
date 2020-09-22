exports.command = ['locate <target>'];

exports.describe = 'Locate a Servers directory';

exports.builder = {
};

exports.handler = async function(argv) {
  const data = require('./store.js');
  store = await data.getLocalStorage();
  const {Process} = await require('./run.js').open(store);
  const target = argv.target;
  const process = new Process(require('./find')(store, target));
  console.log(process.path);
};
