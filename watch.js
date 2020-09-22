const target = process.argv[2];
/** main */
async function main() {
  const data = require('./store.js');
  store = await data.getLocalStorage();
  const {Process} = await require('./run.js').open(store);
  if (!target) throw new Error(`Missing required argument <target>`);
  const proc = new Process(target);
  console.log('watching: ', target);
  await new Promise(function(resolve, reject) {
    /** recursive timeout to check for process ending */
    function pend() {
      if (Process.isRunning(proc.server.pid)) setTimeout(pend, 100);
      else resolve();
    }
    setTimeout(pend, 100);
  });
  await store.get('servers').get(target).set('active', false).write();
  await store.get('servers').get(target).set('pid', null).write();
  console.log(target, ' exit');
}
main();
