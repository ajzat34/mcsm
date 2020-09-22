const yargs = require('yargs');
const chalk = require('chalk');
const boxen = require('boxen');
const box = require('./box.js');
const inquirer = require('inquirer');

/* exit codes:
* 1x = generic
* 11 = database locked
* 1xx = create
*/

// box(chalk.bold(`MC Server Manager v${require('./package.json').version}`));
yargs
    .command(require('./list.js'))
    .command(require('./create.js'))
    .command(require('./run.js'))
    .command(require('./locate.js'))
    .demandCommand()
    .wrap(Math.min(100, process.stdout.columns || 100))
    .argv;
