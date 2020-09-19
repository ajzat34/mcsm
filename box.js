const boxen = require('boxen');

const boxenOpts = {
  padding: 0,
  margin: 0,
  borderStyle: 'round',
  borderColor: 'blue',
};
module.exports = function(text) {
  console.log(boxen(' ' + text + ' ', boxenOpts));
};
