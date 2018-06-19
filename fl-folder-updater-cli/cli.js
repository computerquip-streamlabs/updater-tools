#! /usr/bin/env node
const update = require('fl-folder-updater');
const path = require('path');
const fs = require('fs');

const minimist_options = {
    string: [
        'hash-algo'
    ],
    boolean: [
        'debug'
    ],
    stopEarly: true
}

const args = require('minimist')(process.argv.slice(2), minimist_options);

function print_help() {
    const cwd = path.resolve();
    const node_name = process.argv[0];
    const script_name = path.relative(cwd, process.argv[1]);
    console.log(`Usage: "${node_name}" "${script_name}" [options] <old_folder> <new_folder> <file_list>`);
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

const options = { ...args }

const cwd = path.resolve();
const file_list = JSON.parse(fs.readFileSync(path.resolve(cwd, args._[2])));

update(args._[0], args._[1], file_list, options);