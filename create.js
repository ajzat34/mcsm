const inquirer = require('inquirer');
const papermc = require('./papermc.js');
const plugins = require('./plugins.js');
const uuid = require('uuid/v4');
const path = require('path');
const fs = require('fs');
const properties = require('./properties.js');
const update = require('./update.js');
const find = require('./find.js');
const ora = require('ora');

/**
* @return {string}
*/
function genuuid() {
  return uuid().replace(/-/g, '_');
}
module.exports.uuid = genuuid;

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
* foreach but async
* @param {array} array
* @param {function} callback
*/
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
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

  if (!(store.lock())) {
    exit('Database is locked! Someone else must be using it right now.', 11);
  }

  if (!(await confirm('Do you accept the Minecraft Server EULA?'))) {
    exit('You did not agree to the EULA.', EXIT_EULA);
  }

  console.log('Getting ready...');
  const versions = await papermc.versions();

  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'alias',
      message: 'Name (no spaces, no caps)',
      default: 'mcs',
      validate(input) {
        return new Promise(function(resolve, reject) {
          if (input && !(input.includes(' '))) resolve(true);
          else resolve(false);
        });
      },
    },
    {
      type: 'input',
      name: 'name',
      message: 'Descriptive Name',
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
      name: 'server-port',
      message: 'Server Port',
      default: '25565',
    },
    {
      type: 'number',
      name: 'maxMem',
      message: 'Max amount of Memory (in Gigabytes)',
      default: 4,
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
      name: 'level-seed',
      message: 'Seed (leave blank for random)',
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

  const id = genuuid();
  const server = {
    id: id,
    path: path.resolve(store.get('server_path').value(), id),
    name: response.name,
    alias: response.alias.toLowerCase(),
    version: 'none',
    dist: 'papermc',
    plugins: {},
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
    minMem: 1,
    maxMem: response.maxMem,
    active: false,
    pid: null,
    safe: false,
  };

  await find.add(store, server.alias, server.id);
  await store.get('servers').set(server.id, server).write();

  await fs.promises.mkdir(server.path);
  await fs.promises.writeFile(
      path.resolve(server.path, 'eula.txt'),
      'eula=true\n');

  await fs.promises.writeFile(
      path.resolve(server.path, 'server.properties'),
      properties.serialize(server.properties),
  );

  await update(server, response.version);
  await store.get('servers').set(server.id, server).write();

  const {Process} = await require('./run.js').open(store);
  await new Promise(function(resolve, reject) {
    const proc = new Process(server.id);
    const spinner = ora('Setting up server...').start();
    const child = proc.cycle();
    child.stdout.on('data', (data)=>{
      const lines = data.toString().trim().split('\n');
      spinner.text = `Setting up server: ${lines[lines.length-1]}`;
    });
    child.stderr.on('data', (data)=>{
      spinner.fail();
      console.error(data.toString());
    });
    child.on('exit', ()=>{
      spinner.text = 'Initial setup';
      spinner.succeed();
      resolve();
    });
  });

  // install plugins

  await store.get('servers').get(server.id).set('safe', true).write();

  // console.log(server);
};
