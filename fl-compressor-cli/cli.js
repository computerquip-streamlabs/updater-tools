#!/usr/bin/env node

const compressor = require('fl-compressor');
const args = require('minimist')(process.argv.slice(2));
const path = require('path');
const fs = require('fs');
const util = require('util');

function print_help() {
    const cwd = path.resolve();
    const node_name = process.argv[0];
    const script_name = path.relative(cwd, process.argv[1]);
    console.log(`Usage: "${node_name}" "${script_name}" <input_folder> <output_folder> <file_list>`);
}

if (args._.length < 3) {
    print_help();
    return;
}

const options = { ...args }
const cwd = path.resolve();

const file_list = JSON.parse(fs.readFileSync(path.resolve(cwd, args._[2])));

compressor.compressFiles(args._[0], args._[1], file_list, options);