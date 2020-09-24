const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const os = require('os');
const fs = require('fs');
const path = require('path');
const defaults = {servers: {}};
const inquirer = require('inquirer');
const exitHook = require('async-exit-hook');

const version = 1;

/**
* Stores persistant data
* @param {string} path
* @param {object} defaults
*/
function store(path, defaults) {
  const adapter = new FileSync(path);
  const db = low(adapter);
  db.defaults(defaults);
  db.write();
  return db;
};
module.exports = store;

/**
* Resolve ~ in files
* @param {string} filepath
* @return {string}
*/
function resolveHome(filepath) {
  if (filepath.startsWith('~/')) {
    return path.resolve(os.homedir(), filepath.replace('~/', ''));
  }
  return filepath;
}

/** get the local storage paths
* @return {string}
*/
function localStorageLocation() {
  return path.resolve(os.homedir(), '.mcserver/data.json');
};
module.exports.localStorageLocation = localStorageLocation;

/**
* ensure a directory exists
* @param {string} dir
*/
function ensureDir(dir) {
  dir = path.dirname(path.resolve(dir));
  if (!fs.existsSync(dir)) {
    console.log(`creating ${dir}`);
    fs.mkdirSync(dir, {recursive: true}, (err) => {
      if (err) throw err;
    });
  }
}
module.exports.ensureDir = ensureDir;

/**
* check if a directory is empty
* @param {string} dirname
* @return {bool}
*/
function isDirEmpty(path) {
  return fs.readdirSync(path).length === 0;
}

/**
* Ask for a new server path
* @param {lowdb} db
*/
async function setupServerPath(db) {
  let confirm = false;
  let storage;
  while (!confirm) {
    storage = (await inquirer.prompt([
      {type: 'input',
        name: 'path',
        message: 'Where should servers be installed?',
        default: '~/.mcserver/servers/',
      },
    ])).path;
    storage = resolveHome(storage);
    confirm = (await inquirer.prompt([
      {type: 'confirm',
        name: 'confirm',
        message: `Is "${storage}" correct?`,
      },
    ])).confirm;
  }
  ensureDir(storage+'/0');
  if (!isDirEmpty(storage)) {
    console.warn(`Server path: ${storage} is not empty`);
  }
  db.set('server_path', storage).write();
}
module.exports.setupServerPath = setupServerPath;

/**
* First time setup
* @param {lowdb} db
*/
async function setup(db) {
  if (!db.get('find').value()) await db.set('find', {}).write();
  if (!db.get('backup_find').value()) await db.set('backup', {}).write();
  if (!db.get('server_path').value()) await setupServerPath(db);
}
module.exports.setup = setup;

/** get a store at the localStorageLocation */
async function getLocalStorage() {
  const storagePath = localStorageLocation();
  if (!storagePath) throw new Error('Unsupported platform');
  ensureDir(storagePath);
  const db = store(storagePath);
  db.defaults(defaults).write();
  const dbversion = db.get('version').value();
  // run first time setup if needed
  if (dbversion < version || dbversion === undefined) {
    console.log(` == First Time Setup == `);
    await setup(db);
    db.set('version', version).write();
    console.log(` == First Time Setup Complete == `);
  }

  db.lock = function() {
    exitHook(()=>{
      if (db.get('lock').value()) {
        db.unlock();
      }
    });

    if (db.get('lock').value()) return false;
    db.set('lock', true).write();
    return true;
  };
  db.unlock = function() {
    db.set('lock', false).write();
  };
  return db;
};
module.exports.getLocalStorage = getLocalStorage;
