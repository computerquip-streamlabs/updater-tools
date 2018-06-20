#!/usr/bin/env node

const differ = require('fl-differ');
const args = require('minimist')(process.argv.slice(2));
const path = require('path');
const fs = require('fs');

function print_help() {
    const cwd = path.resolve();
    const node_name = process.argv[0];
    const script_name = path.relative(cwd, process.argv[1]);
    console.log(`Usage: "${node_name}" "${script_name}" <from_file_list> <to_file_list> <diff_list_name>`);
}

if (args._.length < 3) {
    print_help();
    return;
}

const options = { ...args }

const result = { };
const callback = (key, value) => { result[key] = value };

const cwd = path.resolve();

const from_list = JSON.parse(fs.readFileSync(path.resolve(cwd, args._[0])));
const to_list = JSON.parse(fs.readFileSync(path.resolve(cwd, args._[1])));

differ(from_list, to_list, options, callback);

fs.writeFileSync(path.resolve(cwd, args._[2]), JSON.stringify(result));