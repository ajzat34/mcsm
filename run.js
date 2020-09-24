const path = require('path');
const {spawn, spawnSync} = require('child_process');
const exitHook = require('async-exit-hook');
const ora = require('ora');
const chalk = require('chalk');

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
    if (!(store.get('servers').has(id).value())) {
      throw new Error(`Server id ${id} does not exist`);
    }
    const server = this.server = store.get('servers').get(id).value();
    if (server.backup) throw new Error(`Cannot load backup of server`);
    if (!server.safe) throw new Error(`Server is not safe for usage, the install process may have been interupted.`);
    this.path = server.path;
  }

  /**
  * update from the store
  */
  update() {
    this.server = store.get('servers').get(this.id).value();
  }

  /**
  * write local copy to the store
  */
  write() {
    store.get('servers').set(this.id, this.server).write();
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
  * @return {subprocess}
  */
  createProcess() {
    return spawn(
        'java',
        this.cmd(),
        {
          cwd: this.path,
        });
  }

  /**
  * run, then stop
  * @return {subprocess}
  */
  cycle() {
    const child = this.createProcess();
    const interval = setInterval(()=>{
      try {
        child.stdin.write('stop\n');
      } catch (err) {}
    }, 2000);
    child.stdin.on('close', ()=>{
      clearInterval(interval);
    });
    return child;
  }

  /**
  * @param {string} message
  * @return {promise}
  */
  cycleFancy(message) {
    const self = this;
    return new Promise(function(resolve, reject) {
      const spinner = ora(`${message}...`).start();
      const child = self.cycle();
      child.stdout.on('data', (data)=>{
        const lines = data.toString().trim().split('\n');
        lines.forEach((line, i) => {
          if (line.includes('ERROR')) {
            spinner.stop();
            ora(chalk.red(line.trim())).fail();
            spinner.start();
          } else if (
            line.includes('WARN') &&
            !line.includes('Advanced terminal features')
          ) {
            spinner.stop();
            ora(chalk.yellow(line.trim())).warn();
            spinner.start();
          }
        });

        spinner.text = `${message}: ${lines[lines.length-1]}`;
      });
      child.stderr.on('data', (data)=>{
        spinner.text = data.toString();
        spinner.fail();
        spinner = ora(`${data.toString()}`).start();
        console.error(data.toString());
      });
      child.on('exit', ()=>{
        spinner.text = message;
        spinner.succeed();
        resolve();
      });
    });
  }

  /**
  * run it
  * @param {bool} interactive
  */
  async run(interactive) {
    const server = this.server = store.get('servers').get(this.id).value();
    if (server.active) {
      if (server.pid && isRunning(server.pid)) {
        exit('Server already active');
      } else {
        console.log(`WARN: ${server.id}@[${server.pid}] is inactive, updating database`);
        await store.get('servers').get(this.id).set('pid', null).write();
        await store.get('servers').get(this.id).set('active', false).write();
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
          stdio: interactive? 'inherit':undefined,
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
  const target = argv.target;
  const proc = new Process(require('./find')(store, target));
  await proc.run(!argv.fork);
  exit();
};
