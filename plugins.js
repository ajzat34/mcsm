const sources = [
  'EssentialsX',
  'WorldEdit',
  'WorldGuard',
  'Multiverse-Core',
  'Multiverse-Portals',
  'Multiverse-NetherPortals',
  'Multiverse-SignPortals',
];

/**
* turn a name into a downloadable url
* @param {string} name
* @return {string}
*/
function url(name) {
  return `https://dev.bukkit.org/projects/${name.toLowerCase()}/files/latest`;
}

sources.url = url;


module.exports = sources;
