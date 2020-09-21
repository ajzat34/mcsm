const path = require('path');
const fs = require('fs');
const paper = require('./papermc');
const download = require('./download.js');

/**
* Update a server
* @param {object} server
* @param {string} version the target version
*/
async function update(server, version) {
  console.log(`Updating ${server.name} from ${server.version} to ${version}`);
  if (server.active == true) {
    throw new Error(`Server must not be active during update.`);
  }
  try {
    await fs.promises.rename(
        path.resolve(server.path, 'server.jar'),
        path.resolve(server.path, 'server.jar.old'),
    );
  } catch (err) {
    if (err.code = 'ENOENT') {
      console.warn(`Backup Failed: server.jar not found`);
    } else {
      throw err;
    }
  }

  try {
    console.log(`${paper.download(version)}`);
    await download(
        paper.download(version),
        path.resolve(server.path, 'server.jar'),
        `Fetching  PaperMC@${version}`,
    );
  } catch (err) {
    console.error(err);
    console.error(`Failed to fetch server version ${version}, cleaning up`);
    await fs.promises.rename(
        path.resolve(server.path, 'server.jar.old'),
        path.resolve(server.path, 'server.jar'),
    );
  }
  server.version = version;
}

module.exports = update;
