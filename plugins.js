const path = require('path');
const fs = require('fs');
const download = require('./download.js');
// const inquirer = require('inquirer');

const plugins = [
  'EssentialsX',
  'WorldEdit',
  'WorldGuard',
  'Multiverse-Core',
  'Multiverse-Portals',
  'Multiverse-NetherPortals',
  'Multiverse-SignPortals',
  'OpenInv',
];

/**
* turn a name into a downloadable url
* @param {string} name
* @return {string}
*/
function url(name) {
  return `https://dev.bukkit.org/projects/${name.toLowerCase()}/files/latest`;
}

plugins.url = url;

/**
* Create a plugin
* @param {string} name
* @param {string} url
* @param {string} bukkit bukkit string to update from
* @param {bool} linklatest does the download link point to a specific version of
  the plugin, or the latest version (only if bukkit=false)
* @return {object}
*/
function create(display, name, url, bukkit=false, linklatest=false) {
  return {
    url,
    bukkit,
    linklatest,
    display,
    name,
    backup: `${name}.backup`,
  };
}

plugins.create = create;

/**
* install a new version of the plugin
* @param {string} dir the path to the plugins folder
* @param {object} plugin result of plugins.create
*/
async function update(server, plugin) {
  console.log(`Updating ${plugin.display} (${plugin.name})`);
  if (server.active == true) {
    throw new Error(`Server must not be active during update.`);
  }
  const dir = path.resolve(server.path, 'plugins');
  let link;
  if (plugin.bukkit) {
    link = url(plugin.bukkit);
  } else {
    if (plugin.linklatest===false) {
    }
    link = plugin.url;
  }

  try {
    await fs.promises.rename(
        path.resolve(dir, plugin.name),
        path.resolve(dir, plugin.backup),
    );
  } catch (err) {
    if (err.code = 'ENOENT') {
      console.warn(`Backup Failed: ${plugin.name} not found`);
    } else {
      throw err;
    }
  }

  try {
    console.log(link);
    await download(
        link,
        path.resolve(dir, plugin.name),
        `Fetching ${plugin.display}`,
    );
  } catch (err) {
    console.error(err);
    console.error(`Failed to fetch plugin`);
    try {
      await fs.promises.rename(
          path.resolve(dir, plugin.backup),
          path.resolve(dir, plugin.name),
      );
    } catch (err) {
      if (err.code = 'ENOENT') {
        console.warn(`Resotre Failed: ${plugin.backup} not found`);
      } else {
        throw err;
      }
    }
  }
}

plugins.update = update;


module.exports = plugins;
