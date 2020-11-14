#!/usr/bin/env node
const yargs = require('yargs');
const chalk = require('chalk');
const boxen = require('boxen');
const box = require('./box.js');
const inquirer = require('inquirer');

/* exit codes:
* 1 = exit from SIGINT
* 1x = generic
* 11 = database locked
* 12 = generic fail
* 13 = server does not exist
* 1xx = create
* 4xx = run
*/

// box(chalk.bold(`MC Server Manager v${require('./package.json').version}`));
yargs
    .command(require('./list.js'))
    .command(require('./create.js'))
    .command(require('./run.js'))
    .command(require('./locate.js'))
    .command(require('./stop.js'))
    .command(require('./start.js'))
    .command(require('./remove.js'))
    .command(require('./backup.js'))
    .command(require('./manage.js'))
    .strict()
    .help()
    .wrap(Math.min(100, process.stdout.columns || 100))
    .argv;
