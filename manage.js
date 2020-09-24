const inquirer = require('inquirer');
const plugins = require('./plugins.js');
const update = require('./update.js');

exports.command = ['update <target>'];

exports.describe = 'Update a server';

exports.builder = {
};

/**
* @return {promise}
*/
async function selectPlugin() {
  return (await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'plugins',
      message: 'Select plugins to install',
      choices: plugins,
    },
  ])).plugins;
}

exports.handler = async function(argv) {
  const data = require('./store.js');
  const store = await data.getLocalStorage();
  const {Process} = await require('./run.js').open(store);
  const target = argv.target;
  const proc = new Process(require('./find')(store, target));
  const result = await selectPlugin();
  for (plugin of result) {
    await plugins.install(proc.server, plugin);
    proc.write();
  }
  await proc.cycleFancy('Setting up plugins');
};
