const zlib = require('zlib');
const fs = require('fs');
const util = require('util');
const axios = require('axios');
const path = require('path');
const slash = require('slash');
const pmap = require('p-map');

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

async function handle_file(base_url, output_folder, file, options) {
    const out_filepath = path.resolve(output_folder, file);
    const decompressor = zlib.createGunzip();
    let response = null;

    try {
        const url = `${base_url}/${slash(file)}.gz`;

        const axios_options = {
            url,
            responseType:'stream'
        };

        response = await axios(axios_options);

        await ensure_path(out_filepath);
    } catch (error) {
        if (error)
            console.log(`Failed to fetch file ${file} - ${error.response.status}`);

        return;
    }

    const out_stream = fs.createWriteStream(out_filepath);
    const decompressed = response.data.pipe(decompressor);

    /* We only need to worry about the last writer
     * in the chain to finish */
    decompressed.on('error', (error) => {
        console.log(`Failed to decompress ${file}`);
        console.log(error);
    });

    const out_pipe = decompressed.pipe(out_stream);

    return new Promise((resolve, reject) => {
        out_pipe.on('finish', resolve);
        out_pipe.on('error', (error) => reject(error));
    });
}

async function download_files(base_url, output_folder, file_list, options) {
    const cwd = path.resolve();

    output_folder = path.resolve(cwd, output_folder);

    let download_list = [ ];
    let progress_counter = 0; /* Starts at 0, ends at Object.keys(file_list).length */

    /* Build a list of files we need to actually download */
    const file_list_keys = Object.keys(file_list);

    for (let idx = 0; idx < file_list_keys.length; ++idx) {
        const file = file_list_keys[idx];

        if (file_list[file] === null) continue;

        download_list.push(file);
    }

    /* For each entry in the download_list... */
    return pmap(download_list, (file) => {
        ++progress_counter;

        if (options.progress) {
            options.progress(file, progress_counter / file_list_keys.length);
        }

        return handle_file(base_url, output_folder, file, options);
    }, { concurrency: 10 });
}

module.exports = download_files;