const axios = require('axios');

/** get a list of versions */
async function versions() {
  const result = await axios.get('https://papermc.io/api/v1/paper');
  return result.data.versions;
}
/**
* get a url to download a version
* @param {string} version
* @return {string}
*/
function download(version) {
  return `https://papermc.io/api/v1/paper/${version}/latest/download`;
}
module.exports.versions = versions;
module.exports.download = download;
