const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ProgressBar = require('progress');

/**
* Download a file
* @param {string} url
* @param {string} file
* @param {string} message
* @return {promise}
*/
function download(url, file, message='Downloading') {
  file = path.resolve(file);
  return new Promise(async (resolve, reject) => {
    const writer = fs.createWriteStream(file);

    try {
      const {data, headers} = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        // headers: {'User-Agent': 'Mozilla'},
        withCredentials: true,
      });
      const totalLength = headers['content-length'];

      const progressBar = new ProgressBar(
          `${message} [:bar] :percent :etas`, {
            width: Math.min(100, process.stdout.columns || 100),
            complete: '=',
            incomplete: ' ',
            renderThrottle: 1,
            total: parseInt(totalLength),
          });

      data.on('data', (chunk) => progressBar.tick(chunk.length));

      data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = download;
