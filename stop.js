exports.command = ['stop <target>'];

exports.describe = 'Stop a server';

exports.builder = {
};

exports.handler = async function(argv) {
  const data = require('./store.js');
  store = await data.getLocalStorage();
  const {Process} = await require('./run.js').open(store);
  const target = argv.target;
  setTimeout(async ()=>{
    const proc = new Process(require('./find')(store, target));
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
      console.log(`Stopped: ${proc.id}@${proc.server.pid}`);
      require('./list').handler();
    } else {
      console.warn(`Server is not running`);
    }
  }, 100);
};
