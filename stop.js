exports.command = ['stop <target>'];

exports.describe = 'Stop a server';

exports.builder = {
};

const ora = require('ora');

exports.handler = async function(argv) {
  const data = require('./store.js');
  store = await data.getLocalStorage();
  const {Process} = await require('./run.js').open(store);
  const target = argv.target;
  const proc = new Process(require('./find')(store, target));
  const spinner = ora(`Stopping "${proc.server.name}"`).start();
  setTimeout(async ()=>{
    if (proc.server.active && proc.server.pid) {
      process.kill(proc.server.pid, 'SIGINT');
      await new Promise(function(resolve, reject) {
        /** recursive timeout to check for process ending */
        function pend() {
          if (Process.isRunning(proc.server.pid)) setTimeout(pend, 100);
          else resolve();
        }
        setTimeout(pend, 500);
      });
      spinner.text = `Stopped "${proc.server.name}"`;
      spinner.succeed();
      require('./list').handler();
    } else {
      spinner.text = `Server "${proc.server.name}" is not running`;
      spinner.fail();
      process.exit(12);
    }
  }, 100);
};
