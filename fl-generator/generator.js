const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const util = require('util');

const readdir = util.promisify(fs.readdir);
const lstat = util.promisify(fs.lstat);

function add_hash_entry(hash, file_path, context) {
    const file_entry = path.relative(context.root_folder_path, file_path);
    context.callback(file_entry, hash);
}

async function handle_file_lstat(stats, file_path, context) {
    if (stats.isSymbolicLink()) {
        console.log(`Ignoring symbolic link: ${file_path}`);
        return;
    }

    if (stats.isDirectory()) {
        const files = await readdir(file_path);
        await handle_folder_read(files, file_path, context);
        return;
    }

    /* Hash the file for later comparison. This is the value of the key. */
    const hash = await new Promise((resolve, reject) => {
        const file_stream = fs.createReadStream(file_path);
        const hash = crypto.createHash(context.hash_algo);

        file_stream.on('data', (chunk) => {
            hash.update(chunk);
        });

        file_stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        file_stream.on('error', reject);

    });

    add_hash_entry(hash, file_path, context);
}

async function handle_folder_read(files, folder_path, context) {
    /* Once upon a time, I was clever and put each stat promise
       into an array and then waited on them as a collection.
       Unfortunately, node doesn't handle opening a lot of files
       very well. Using graceful-fs works in this case but since
       this tool must be run on the client side, and I can't
       guarantee what type of hardware the client has, I don't
       necessarily want fast but stable.

       However, if you're using this for a server for whatever
       reason and you want it to scale, simply change out fs with
       graceful-fs, queue each promise into an array and call
       Promise.all instead of waiting on them individually. */

    for (let i = 0; i < files.length; ++i) {
        const file_path = path.resolve(folder_path, files[i]);

        const stats = await lstat(file_path);
        await handle_file_lstat(stats, file_path, context);
    }
}

/**
    Our primary entry point and what gets executed
    if we run from command line.

    @param folder_path
        A full or relative path to the file
        If it's a full path, the file list will
        still contain a relative path since its
        required when updating.

    @param hash_algo
        The hash algorithm to use when creating a
        hash for the file. This is to be one of the
        elements returned from crypto.getHashes().
        It may return a hash that doesn't work
        out of the box. My answer to that is use
        one that's supported. I may add a whilelist
        at a later time.

    @todo A callback when a path/hash key/value is made should
          be used instead to allow formats outside of json.
          It would also be the easiest way to prevent having
          to load the entirety of the file list into a single
          object which can be heavy in some use-cases.
 */
async function generateFileList(folder_path, options, callback) {
    const cwd = path.resolve();

    /* Our list is a dictionary where the key
     * is the relative path to the file from
     * the root directory. This is important
     * since it's used during updating as well
     * since full path will obviously differ per
     * machine. */
    const root_folder_path = path.resolve(cwd, folder_path);

    if (!options['hash-algo'])
        options['hash-algo'] = 'sha1';

    const context = {
        callback,
        root_folder_path,
        hash_algo: options['hash-algo']
    }

    const files = await readdir(root_folder_path);
    await handle_folder_read(files, root_folder_path, context);
}

module.exports = {
    generateFileList
}