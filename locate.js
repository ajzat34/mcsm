exports.command = ['locate'];

exports.describe = 'Locate a Servers directory';

exports.builder = {
};

exports.handler = async function(argv) {
  const data = require('./store.js');
  store = await data.getLocalStorage();
  const {Process} = await require('./run.js').open(store);
  const target = argv['_'][1];
  if (!target) exit('No target specified');
  const process = new Process(require('./find')(store, target));
  console.log(process.path);
};
