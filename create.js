const inquirer = require('inquirer');
const papermc = require('./papermc.js');
const plugins = require('./plugins.js');
const uuid = require('uuid/v4');
const path = require('path');
const fs = require('fs');
const properties = require('./properties.js');

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

exports.command = ['create'];

exports.describe = 'Create a Server';

exports.builder = {
};

// exit codes
const EXIT_EULA = 101;

/**
* print a message to stderr and exit with a code (default 0)
* @param {string} msg
* @param {number} code
*/
function exit(msg, code=0) {
  if (msg) console.error(msg);
  process.exit(code);
}

exports.handler = async function(argv) {
  const data = require('./store.js');
  const store = await data.getLocalStorage();

  if (!(await confirm('Do you accept the Minecraft Server EULA?'))) {
    exit('You did not agree to the EULA.', EXIT_EULA);
  }

  console.log('Getting ready...');
  const versions = await papermc.versions();

  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Server Name',
      default: 'Minecraft Server',
      validate(input) {
        return new Promise(function(resolve, reject) {
          if (input) resolve(true);
          else resolve(false);
        });
      },
    },
    {
      type: 'list',
      name: 'version',
      message: 'Select Server Version',
      choices: versions,
    },
    {
      type: 'checkbox',
      name: 'plugins',
      message: 'Select Plugins',
      choices: plugins,
    },
    {
      type: 'input',
      name: 'level-seed',
      message: 'Seed (leave blank for random)',
    },
    {
      type: 'input',
      name: 'server-port',
      message: 'Server Port',
      default: '25565',
    },
    {
      type: 'number',
      name: 'max-players',
      message: 'Max number of players',
      default: 20,
    },
    {
      type: 'input',
      name: 'motd',
      message: 'Message of the Day (MOTD)',
    },
    {
      type: 'input',
      name: 'view-distance',
      message: 'Server View Distance (In Chunks)',
      default: 10,
    },
    {
      type: 'list',
      name: 'difficulty',
      message: 'Choose Difficulty',
      choices: ['Peaceful', 'Easy', 'Normal', 'Hard'],
      default: 1,
    },
    {
      type: 'list',
      name: 'gamemode',
      message: 'Choose Gamemode',
      choices: ['Survival', 'Creative', 'Spectator', 'Adventure'],
    },
    {
      type: 'list',
      name: 'pvp',
      message: 'Allow PvP',
      choices: ['True', 'False'],
    },
    {
      type: 'list',
      name: 'enable-command-block',
      message: 'Enable Command Blocks',
      choices: ['True', 'False'],
    },

  ]);
  if (!(await confirm('Correct'))) exit();

  const id = uuid().replace(/-/g, '_');
  const server = {
    id: id,
    path: path.resolve(store.get('server_path').value(), id),
    name: response.name,
    version: response.version,
    dist: 'papermc',
    plugins: [],
    properties: {
      'motd': response.motd,
      'server-port': response['server-port'],
      'max-players': response['max-players'],
      'view-distance': response['view-distance'],
      'level-seed': response['level-seed'],
      'difficulty': response['difficulty'].toLowerCase(),
      'gamemode': response['gamemode'].toLowerCase(),
      'pvp': response['pvp'].toLowerCase(),
      'enable-command-block': response['enable-command-block'].toLowerCase(),
    },
  };

  store.get('servers').set(server.id, server).write();

  await fs.promises.mkdir(server.path);
  await fs.promises.writeFile(
      path.resolve(server.path, 'eula.txt'),
      'eula=true\n');

  await fs.promises.writeFile(
      path.resolve(server.path, 'server.properties'),
      properties.serialize(server.properties),
  );
  console.log(server);
};
