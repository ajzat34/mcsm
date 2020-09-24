const inquirer = require('inquirer');
const rimraf = require('rimraf');
const path = require('path');

exports.command = ['remove <target>', 'rm <target>'];

exports.describe = 'Remove a server entry';

exports.builder = {
};

/**
* @param {string} message
* @return {bool}
*/
async function confirm(message) {
  return (await inquirer.prompt([
    {type: 'confirm',
      name: 'confirm',
      default: false,
      message: message,
    },
  ])).confirm;
}

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
  const {Process} = await require('./run.js').open(store);
  const target = argv.target;
  const proc = new Process(require('./find')(store, target));

  if (!(store.lock())) {
    exit('Database is locked! Someone else must be using it right now.', 11);
  }

  const server = store.get('servers').get(proc.server.id).value();

  const dir = path.resolve(server.path);
  console.log(`Files to remove: ${dir}`);

  if (!(await confirm(
      `Are you sure you want to delete "${proc.server.name}" (${proc.server.alias})?`))) {
    exit(null, 0);
  }

  await new Promise(function(resolve, reject) {
    rimraf(dir, (err)=>{
      if (err) reject(err);
      else resolve();
    });
  });

  console.log(
      `Removing database entry for: ${proc.server.id} (${proc.server.name})`);
  await store.get('servers').unset(proc.server.id).write();
  console.log(
      `Removing seach entry for: ${proc.server.alias} -> (${proc.server.id})`);
  await store.get('find').unset(proc.server.alias).write();

  store.unlock();
};
