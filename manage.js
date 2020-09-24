const inquirer = require('inquirer');
const plugins = require('./plugins.js');
const update = require('./update.js');
const papermc = require('./papermc.js');
const ora = require('ora');

exports.command = ['update <target>'];

exports.describe = 'Update a server';

exports.builder = {
};

/**
* @param {array} defaults
* @return {promise}
*/
async function selectPlugin(defaults) {
  return (await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'plugins',
      message: 'Select plugins to install',
      choices: plugins,
      default: defaults,
    },
  ])).plugins;
}


/**
* @param {string} message
* @return {bool}
*/
async function confirm(message) {
  return (await inquirer.prompt([
    {type: 'confirm',
      name: 'confirm',
      message: message,
    },
  ])).confirm;
}


/**
* @param {string} current
* @return {string}
*/
async function selectVersion(current) {
  let versions = await papermc.versions();
  versions[0] = {
    name: `${versions[0]} <-- latest version`,
    value: versions[0],
  };
  versions = ['Keep server version'].concat(versions);
  for (i in versions) {
    const version = versions[i];
    if (version === current) {
      console.log(current);
      versions[i] = {
        name: `${version} <-- current version`,
        value: version,
      };
      break;
    }
  }
  const response = (await inquirer.prompt([
    {
      type: 'list',
      name: 'version',
      message: 'Select Server Version',
      choices: versions,
    },
  ])).version;
  return response;
}

exports.handler = async function(argv) {
  const data = require('./store.js');
  const store = await data.getLocalStorage();
  const {Process} = await require('./run.js').open(store);
  const target = argv.target;
  const proc = new Process(require('./find')(store, target));

  const sversion = await selectVersion(proc.server.version);
  if (await confirm('Create a backup (before updating)')) {
    const spinner = ora(`Backing up ${proc.server.id}`).start();
    await require('./backup.js').backup(store, proc.server.id, proc.server.alias);
    spinner.succeed();
  }

  if (sversion !== 'Keep server version') {
    require('./update.js')(proc.server, sversion);
    proc.write();
    await proc.cycleFancy('Setting up new server version');
  }

  const result = await selectPlugin(Object.keys(proc.server.plugins));
  for (plugin of result) {
    await plugins.install(proc.server, plugin);
    proc.write();
  }
  if (result.length) await proc.cycleFancy('Setting up plugins');
};
