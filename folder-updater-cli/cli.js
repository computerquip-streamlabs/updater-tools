#! /usr/bin/env node
const updater = require('folder-updater');
const path = require('path');
const fs = require('fs');

const minimist_options = {
    string: [
        'file-list',
        'hash-algo'
    ],
    boolean: [
        'file-list-bypass',
        'debug'
    ],
    stopEarly: true
}

const args = require('minimist')(process.argv.slice(2), minimist_options);

function print_help() {
    const cwd = path.resolve();
    const node_name = process.argv[0];
    const script_name = path.relative(cwd, process.argv[1]);
    console.log(`Usage: "${node_name}" "${script_name}" [options] <old_folder> <new_folder>`);
}

if (args['debug'])
    console.log(args);

if (args._.length < 2) {
    console.log('too few parameters provided');
    print_help();
    return;
}

if (args._.length > 2) {
    console.log('too many parameters provided');
    print_help();
    return;
}

if (!args['file-list'] && !args['file-list-bypass']) {
    console.log('file-list option is required by default');
    return;
}

if (args['file-list-bypass'] && args['file-list']) {
    console.log('file-list-bypass and file-list conflict');
    return;
}

const options = { ...args }

updater.updateFolder(args._[0], args._[1], options);