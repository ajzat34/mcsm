exports.command = ['list', 'ls', 'l'];

exports.describe = 'List Servers';

exports.builder = {
};

exports.handler = async function(argv) {
  const data = require('./store.js');
  const store = await data.getLocalStorage();
  const servers = store.get('servers').value();
  console.table(servers);
};
