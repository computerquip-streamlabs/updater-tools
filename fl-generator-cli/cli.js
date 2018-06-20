#!/usr/bin/env node

const generate = require('fl-generator');
const args = require('minimist')(process.argv.slice(2));
const path = require('path');
const fs = require('fs');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);

function print_help() {
    const cwd = path.resolve();
    const node_name = process.argv[0];
    const script_name = path.relative(cwd, process.argv[1]);
    console.log(`Usage: "${node_name}" "${script_name}" <folder_path> <output_file>`);
}

if (args._.length < 2) {
    print_help();
    return;
}

const options = { ...args }

const result = { }
const callback = (key, value) => { result[key] = value; }

generate(args._[0], options, callback)
    .then(async () => {
        const cwd = path.resolve();
        const file_path = path.resolve(cwd, args._[1]);
        await writeFile(file_path, JSON.stringify(result));
    });