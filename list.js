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

const RUNNING = chalk.green('Running');
const STOPPED = chalk.red('Stopped');

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

  const td = [];
  td.push(['Alias', 'Name', 'Status', 'MOTD', 'pid', 'CPU', 'MEM', 'Uptime']);

  for (id of Object.keys(servers)) {
    const server = servers[id];
    let stats;
    if (server.pid) {
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
    td.push([
      server.alias,
      server.name,
      server.active? RUNNING:STOPPED,
      server.motd,
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

  process.stdout.write(table(td, tableopt));
};
