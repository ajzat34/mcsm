const path = require('path');
const {spawn, spawnSync} = require('child_process');
const exitHook = require('async-exit-hook');

let store;

const TIMEOUT_EXIT_WAIT = 1000*30;

// exit codes
const EXIT_FORK_NONINTER = 401;

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
* Check if a pid is running
* @param {number} pid
* @return {bool}
*/
function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
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
    const server = this.server = store.get('servers').get(id).value();
    this.path = server.path;
  }

  /**
  * update from the store
  */
  update() {
    this.server = store.get('servers').get(this.id).value();
  }

  /** @return {string} the path to the jar */
  jar() {
    return path.resolve(this.path, 'server.jar');
  }

  /** @return {string} the command to run the server */
  cmd() {
    return [`-Xms${this.server.minMem}G`, `-Xmx${this.server.maxMem}G`, `-jar`, `${this.jar()}`];
  }

  /**
  * run it
  * @param {bool} interactive
  */
  async run(interactive=true, fork=false) {
    const server = this.server = store.get('servers').get(this.id).value();
    if (server.active) {
      if (isRunning(server.pid)) {
        exit('Server already active');
      }
    }
    await store.get('servers').get(this.id).set('active', true).write();

    let running = true;

    if (interactive) {
      await store.get('servers').get(this.id).set('pid', null).write();
      exitHook(async (callback)=>{
        const start = new Date();
        console.log('Waiting for server to exit...');
        setInterval(()=>{
          if (running === false) callback();
          if (new Date()-start > TIMEOUT_EXIT_WAIT) {
            console.error(`...timed out after ${new Date()-start} ms`);
            callback();
          }
        }, 100);
      });
    }

    if (interactive) {
      exitHook(async (callback)=>{
        await store.get('servers').get(this.id).set('active', false).write();
        await store.get('servers').get(this.id).set('pid', null).write();
        callback();
      });
    }

    const child = this.process = (interactive?spawnSync:spawn)(
        'java',
        this.cmd(),
        {
          cwd: this.path,
          stdio: interactive? 'inherit':null,
          detached: !interactive,
        },
    );

    if (interactive) {
      running = false;
    } else {
      await store.get('servers').get(this.id).set('pid', child.pid).write();
      this.watch = spawn(
          'node',
          [path.resolve(__dirname, 'watch.js'), this.id],
          {
            detached: true,
          },
      );
      exit();
    }
  }
};

Process.isRunning = isRunning;

module.exports.open = async function(loadstore) {
  store = loadstore;
  return {
    Process: Process,
  };
};

exports.command = ['run <target> [--fork]'];

exports.describe = 'Run a Server';

exports.builder = {
};

exports.handler = async function(argv) {
  const data = require('./store.js');
  store = await data.getLocalStorage();
  // console.log(argv);
  const target = argv.target;
  const process = new Process(require('./find')(store, target));
  process.run(!argv.fork);
};
