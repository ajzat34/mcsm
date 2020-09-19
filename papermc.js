const axios = require('axios');

/** get a list of versions */
async function versions() {
  const result = await axios.get('https://papermc.io/api/v1/paper');
  return result.data.versions;
}
module.exports.versions = versions;
