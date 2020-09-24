const fs = require('fs');
const archiver = require('archiver');
const exitHook = require('async-exit-hook');
const dateFormat = require('dateformat');
const create = require('./create.js');
const path = require('path');
const ora = require('ora');

exports.command = ['backup <target>'];

exports.describe = 'Backup a Server';

exports.builder = {
};

/**
* backup a server
* @param {lowdb} store
* @param {string} id
* @param {string} name
* @return {promise}
*/
function backup(store, id, name) {
  return new Promise(async function(resolve, reject) {
    let ext = 0;
    let success = false;
    let backupname = name;
    while (!success) {
      try {
        backupname = `${name}${ext?`_${ext}`:''}`;
        require('./find')(store, `b:${backupname}`);
        ext++;
      } catch (err) {
        if (err.code == 'DNE') {
          success = true;
        } else {
          reject(err);
        }
      }
    }

    activeJob = true;

    exitHook(()=>{
      if (activeJob) console.log(`WARN: A backup job failed to finish`);
    });

    const old = store.get('servers').get(id).cloneDeep().value();

    const nid = create.uuid();
    const server = {
      old,
      backup: true,
      alias: `b:${backupname}`,
      id: nid,
      name: `Backup of ${old.alias} (${dateFormat(new Date(), 'yyyy-mm-dd Z')})`,
      version: old.version,
      path: path.resolve(store.get('server_path').value(), `${nid}.zip`),
      safe: false,
    };

    await store.get('servers').set(server.id, server).write();
    await require('./find').addbackup(store, backupname, server.id);

    const output = fs.createWriteStream(server.path);
    const archive = archiver('zip', {
      zlib: {level: 9},
    });

    archive.on('error', function(err) {
      reject(err);
    });
    archive.on('warning', function(err) {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(old.path, old.id);
    archive.finalize();

    output.on('close', async function() {
      await store.get('servers').get(server.id).set('safe', true).write();
      activeJob = false;
      resolve(archive.pointer());
    });
  });
}

exports.backup = backup;

exports.handler = async function(argv) {
  const data = require('./store.js');
  store = await data.getLocalStorage();
  // console.log(argv);
  const target = argv.target;
  const id = require('./find')(store, target);
  const spinner = ora(`Backing up ${id}`).start();
  try {
    await backup(store, id, target);
    spinner.succeed();
    await require('./list').handler();
  } catch (err) {
    spinner.fail();
    throw err;
  }
};
