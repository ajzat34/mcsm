const path = require('path');
const fs = require('fs');
const axios = require('axios');
const download = require('./download.js');
const curseforge = require('mc-curseforge-api');
const inquirer = require('inquirer');
const bukkit = require('./bukkit.js');
const ora = require('ora');

const plugins = {
  'EssentialsX': {
    curseforge: 93271,
  },
  'Vault': {
    curseforge: 33184,
  },
  'WorldEdit': {
    curseforge: 31043,
  },
  'WorldGuard': {
    curseforge: 31054,
  },
  'Multiverse-Core': {
    curseforge: 30765,
  },
  'Multiverse-Portals': {
    curseforge: 30781,
  },
  'Multiverse-SignPortals': {
    curseforge: 31376,
  },
  'Multiverse-NetherPortals': {
    curseforge: 30783,
  },
  'OpenInv': {
    curseforge: 31432,
  },
  'Shopkeepers': {
    curseforge: 42795,
  },
  'FarmProtect': {
    curseforge: 44691,
  },
  'ServerSigns': {
    curseforge: 33254,
  },
  'Holographic Displays': {
    curseforge: 75097,
  },
  'PlugMan': {
    curseforge: 36006,
  },
};

/**
* @param {string} pluginname
* @return {array}
*/
async function bukkitManifest(pluginname) {
  if (!pluginname in plugins) throw new Error(`plugin ${pluginname} does not exist`);
  const plugin = plugins[pluginname];
  const res = await axios.get(bukkit(plugin.curseforge));
  const data = res.data;
  return data.reverse();
}

/**
* @param {string} pluginname
* @return {array}
*/
async function selectVersion(pluginname) {
  const manifest = await bukkitManifest(pluginname);
  manifest.forEach((plugin, i) => {
    plugin.name = `${plugin.name || 'Unnamed File'} @${plugin.gameVersion}`;
    plugin.value = plugin;
  });
  const response = (await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'plugins',
      message: 'Which Files should be installed',
      choices: manifest,
    },
  ])).plugins;
  const result = [];
  response.forEach((item, i) => {
    result.push({
      name: item.name,
      url: item.downloadUrl,
      filename: item.fileName,
      version: item.gameVersion,
    });
  });
  return result;
}

/**
* install (server must be written back to the store after)
* @param {object} server
* @param {string} pluginname
*/
async function install(server, pluginname) {
  const spinnerbase = `Installing ${pluginname}`;
  if (server.backup) {
    ora(spinnerbase).fail();
    throw new Error(`Cannot update a backup`);
  }

  // ask for what files to install
  const files = await selectVersion(pluginname);

  // setup
  const spinner = ora(spinnerbase).start();
  const pluginspath = path.resolve(server.path, 'plugins');

  // get the old plugin
  let oldPlugin = false;
  if (pluginname in server.plugins) {
    oldPlugin = server.plugins[pluginname];
  }

  const newFiles = [];

  // download new files
  for (file of files) {
    spinner.text = `${spinnerbase} - File: ${file.filename}`;
    spinner.stop();
    await download(
        file.url,
        path.resolve(pluginspath, `${file.filename}.new`),
        `Fetching: ${file.filename}`,
    );
    spinner.start();
    newFiles.push(file.filename);
  }

  // remove old files
  spinner.text = `${spinnerbase} - Removing old files`;
  if (oldPlugin) {
    for (file of oldPlugin.manifest) {
      spinner.text = `${spinnerbase} - Removing old files - ${file}`;
      try {
        await fs.promises.unlink(path.resolve(pluginspath, file));
      } catch (err) {
        spinner.fail();
        console.error(err);
        spinner.start();
      }
    }
  }

  // install new files
  for (file of files) {
    spinner.text = `${spinnerbase} - Installing File: ${file.filename}`;
    try {
      await fs.promises.rename(
          path.resolve(pluginspath, `${file.filename}.new`),
          path.resolve(pluginspath, file.filename),
      );
    } catch (err) {
      console.error(err);
    }
  }

  spinner.text = `${spinnerbase} - Updating database`;
  server.plugins[pluginname] = {
    manifest: newFiles,
    version: files[0].version,
  };

  spinner.text = spinnerbase;
  spinner.succeed();
}

module.exports = Object.keys(plugins);
module.exports.install = install;

module.exports.selectVersion = selectVersion;
