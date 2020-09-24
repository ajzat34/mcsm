exports.command = ['list', 'ls', 'l', '$0'];

exports.describe = 'List Servers';

exports.builder = {
};

const os = require('os');
const cpuCount = os.cpus().length;

const pidusage = require('pidusage');
const {table} = require('table');
const chalk = require('chalk');
const prettyBytes = require('pretty-bytes');
const humanizeDuration = require('humanize-duration');
const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      y: () => 'y',
      mo: () => 'mo',
      w: () => 'w',
      d: () => 'd',
      h: () => 'h',
      m: () => 'm',
      s: () => 's',
      ms: () => 'ms',
    },
  },
});

const RUNNING = chalk.bgGreen(' Running ');
const STOPPED = chalk.bgRed(' Stopped ');

const tableopt = {
  columns: {
    0: {
      alignment: 'right',
    },
  },
  border: {
    topBody: `─`,
    topJoin: `┬`,
    topLeft: `╭`,
    topRight: `╮`,

    bottomBody: `─`,
    bottomJoin: `┴`,
    bottomLeft: `╰`,
    bottomRight: `╯`,

    bodyLeft: `│`,
    bodyRight: `│`,
    bodyJoin: `│`,

    joinBody: `─`,
    joinLeft: `├`,
    joinRight: `┤`,
    joinJoin: `┼`,
  },
};

exports.handler = async function(argv) {
  const data = require('./store.js');
  const store = await data.getLocalStorage();

  const servers = store.get('servers').value();
  const find = store.get('find').value();
  const backup = store.get('backup_find').value();

  td = [];
  /**
  * add a entry to the table
  * @param {object} server
  * @param {bool} less
  */
  async function tableAdd(server, less=false) {
    let stats;
    if (server.pid && less===false) {
      try {
        stats = await pidusage(server.pid);
      } catch (err) {
        if (err.code = 'ENOENT') {
          console.warn(`WARN: ${id}@[${server.pid}] is inactive, updating database`);
          await store.get('servers').get(id).set('active', false).write();
          await store.get('servers').get(id).set('pid', null).write();
        } else {
          console.error(err);
        }
      }
    }
    if (less) {
      td.push([
        server.alias,
        server.name,
        server.version,
      ]);
    } else {
      td.push([
        server.alias,
        server.name,
        server.version,
      server.active? RUNNING:STOPPED,
      server.properties.motd,
      stats? server.pid:'--',
      stats? `${stats.cpu/cpuCount}%`:'--',
      stats? prettyBytes(stats.memory): '--',
      stats? shortEnglishHumanizer(stats.elapsed, {
        largest: 2,
        round: true,
        language: 'shortEn',
        spacer: '',
        delimiter: ' ',
      }): '--',
      ]);
    }
  }

  td=[];
  td.push([
    'Alias',
    'Name',
    'Version',
    'Status',
    'MOTD',
    'pid',
    'CPU',
    'MEM',
    'Uptime',
  ]);
  for (alias of Object.keys(find)) {
    const server = servers[find[alias]];
    await tableAdd(server);
  }
  process.stdout.write(table(td, tableopt));

  if (backup) {
    td=[];
    td.push([
      'Alias',
      'Name',
      'Version',
    ]);
    for (alias of Object.keys(backup)) {
      const server = servers[backup[alias]];
      await tableAdd(server, true);
    }
    console.log('Backups:');
    process.stdout.write(table(td, tableopt));
  }
};
