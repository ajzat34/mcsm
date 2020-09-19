const fs = require('fs');
const path = require('path');
const axios = require('axios');
/**
* Download a file
* @param {string} url
* @param {string} file
* @param {string} backupto backup the file currently at <file> to <backupto>
* @return {promise}
*/
function download(url, file, backupto) {
  return new Promise(async (resolve, reject) => {
    if (backupto) {
      try {
        await fs.promises.rename(file, backupto);
        await fs.promises.writeFile(file + '.backup.json', JSON.serialize({
          old: backupto,
          current: file,
        }));
        console.log(`Backed up "${file}" to "${backupto}"`);
      } catch (err) {}
    }
    const writer = Fs.createWriteStream(file);
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

module.exports = download;
