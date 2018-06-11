const zlib = require('zlib');
const fs = require('fs');
const util = require('util');
const axios = require('axios');
const path = require('path');

const mkdir = util.promisify(fs.mkdir);
const inflate = util.promisify(zlib.inflate);

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

async function handle_file(base_url, output_folder, file, options) {
    const base_filename = path.basename(file, '.deflated');
    const out_filepath = path.resolve(output_folder, path.dirname(file), base_filename);
    const decompressor = zlib.createInflate();
    let response = null;

    try {
        response =
            await axios({
                baseURL: base_url,
                url: `${file}.deflated`,
                responseType:'stream'
            });

        await ensure_path(out_filepath);
    } catch (error) {
        console.log(`Failed to fetch file ${file} - ${error.response.status}`);
        return;
    }

    const out_stream = fs.createWriteStream(out_filepath);
    const decompressed = response.data.pipe(decompressor);

    decompressed.on('error', (error) => {
        console.log(`Failed to decompress ${file}`);
        console.log(error);
    });

    decompressed.pipe(out_stream);
}

async function downloadFiles(base_url, output_folder, file_list, options) {
    const cwd = path.resolve();
    let file_promises = [];

    output_folder = path.resolve(cwd, output_folder);

    /* We should add a limit to the number of files we queue for download.
     * We should be able to easily do this using Promise.race and checking
     * promise state. */
    for (const file in file_list) {
        file_promises.push(handle_file(base_url, output_folder, file, options));
    }

    await Promise.all(file_promises);
}

module.exports = {
    downloadFiles
}