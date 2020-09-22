const path = require('path');
const {spawn} = require('child_process');

let store;

/**
* print a message to stderr and exit with a code (default 0)
* @param {string} msg
* @param {number} code
*/
function exit(msg, code=0) {
  if (msg) console.error(msg);
  process.exit(code);
}

/**
* Track a running server process
*/
class Process {
  /**
  * @constructor
  * @param {string} id
  */
  constructor(id) {
    this.id = id;
    if (!(store.lock())) {
      exit('Database is locked! Someone else must be using it right now.', 11);
    }
    const server = this.server = store.get('servers').get(id).value();
    this.path = server.path;
  }

  /** @return {string} the path to the jar */
  jar() {
    return path.resolve(this.path, 'server.jar');
  }

  /** @return {string} the command to run the server */
  cmd() {
    return [`-Xms${this.server.minMem}G`, `-Xmx${this.server.maxMem}G`, `-jar`, `${this.jar()}`];
  }

  /** run it */
  run() {
    this.process = spawn('java', this.cmd(), {
      cwd: this.path,
      stdio: 'inherit',
    });
  }
};

module.exports.open = async function(loadstore) {
  store = loadstore;
  return {
    Process: Process,
  };
};

exports.command = ['run'];

exports.describe = 'Run a Server';

exports.builder = {
};

exports.handler = async function(argv) {
  const data = require('./store.js');
  store = await data.getLocalStorage();
  const target = argv['_'][1];
  if (!target) exit('No target specified');
  const process = new Process(require('./find')(store, target));
  console.log(process.cmd());
  process.run();
};
