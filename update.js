const path = require('path');
const fs = require('fs');
const paper = require('./papermc');
const download = require('./download.js');

/**
* move a file
* @param {string} src
* @param {string} dst
* @return {false|Error}
*/
async function move(src, dst) {
  try {
    await fs.promises.rename(
        src, dst,
    );
  } catch (err) {
    return err;
  }
  return false;
}

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
  console.log(`${paper.download(version)}`);
  await download(
      paper.download(version),
      path.resolve(server.path, 'server.new.jar'),
      `Fetching  PaperMC@${version}`,
  );
  let err;
  if (
    err = await move(
        path.resolve(server.path, 'server.new.jar'),
        path.resolve(server.path, 'server.jar'))
  ) {
    console.error('Failed to install new server jar');
    throw err;
  }
  server.version = version;
}

module.exports = update;
