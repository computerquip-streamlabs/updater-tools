const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const util = require('util');

const mkdir = util.promisify(fs.mkdir);

async function mkdir_maybe(directory) {
    try {
        await mkdir(directory);
    } catch (error) {
        if (error.code !== 'EEXIST')
            throw error;
    }
}

async function ensure_path(filepath) {
    const directories = path.dirname(filepath).split(path.sep)

    let directory = directories[0];

    for (let i = 1; i < directories.length; ++i) {
        directory += path.sep + directories[i];
        await mkdir_maybe(directory);
    }
}

async function compressFiles(input_folder, output_folder, file_list, options) {
    const cwd = path.resolve();

    input_folder = path.resolve(cwd, input_folder);
    output_folder = path.resolve(cwd, output_folder);

    for (const file in file_list) {
        const compressor = zlib.createDeflate();
        const assumed_in_file = path.resolve(input_folder, file);
        const out_file = path.resolve(output_folder, file + '.deflated');

        await ensure_path(out_file);

        const in_stream = fs.createReadStream(assumed_in_file);
        const out_stream = fs.createWriteStream(out_file);

        const compressed = in_stream.pipe(compressor)

        compressed.on('error', (error) => {
            console.log(`Failed to compress ${file}`);
            console.log(error);
        });

        compressed.pipe(out_stream);
    }
}

module.exports = {
    compressFiles
}