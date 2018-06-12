const fs = require('fs');
const path = require('path');
const util = require('util');
const flg = require('fl-generator');

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const lstat = util.promisify(fs.lstat);
const unlink = util.promisify(fs.unlink);
const mkdir = util.promisify(fs.mkdir);

async function mkdir_maybe(directory) {
    try {
        await mkdir(directory);
    } catch (error) {
        if (error.code !== 'EEXIST')
            throw error;
    }
}

async function delete_file_maybe(filepath) {
    try {
        await unlink(filepath);
    } catch(error) {
        if (error.code !== 'ENOENT')
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

async function handle_filelist_file_copy(file_list, new_folder, old_folder) {
    /* When copying with a file list, we have a few things
     * to take into consideration.
     *
     * Deleted files are files marked in the file list with
     * a null checksum. When these files are encountered
     * (if at all), they are simply deleted without question.
     *
     * If a deleted file leaves a directory empty, the directory
     * is left there. I'm not sure how to deal with this though
     * I think a flag giving a couple options might suffice.
     * If a mixture of deleting and leaving directories there
     * is needed, that probably won't be handled by this tool.
     *
     * If the file list specifies a file in a directory that
     * doesn't exist, the directory is created.*/
    for (const file in file_list) {
        const filepath = path.resolve(old_folder, file);
        const file_to_copy = path.resolve(new_folder, file);

        if (file_list[file] === null) {
            await delete_file_maybe(filepath);
            continue;
        }

        await ensure_path(filepath);
        await writeFile(filepath, await readFile(file_to_copy));
    }
}

async function file_list_cmp(file_list, new_folder, hash_algo) {
    const new_file_list = await flg.generateFileList(hash_algo, new_folder);

    for (const file in file_list) {
        /* Make sure each entry in the new file list (which represents
         * the directory we're copying from) has an entry corresponding
         * to the file list given. This makes sure the file actually
         * exists. */
        if (file_list[file] === null) continue;

        if (!new_file_list.hasOwnProperty(file)) {
            console.log(`File list specifies ${file} ` +
                        `but wasn't found in ${file_list_path}`)
            return false;
        }

        /* We now know that each file list has an entry with the
         * same key. We can now fetch the checksum to make sure
         * they're they same file. */
        if (file_list[file] !== new_file_list[file]) {
            console.log(`File list specified checksum ${file_list[file]} but ` +
                        `file checksum is ${new_file_list[file]}. Make sure ` +
                        `the same algorithm is used and the checksum given ` +
                        `in the file list is correct.`);
            return false;
        }
    }

    return true;
}

/*
 * @param new_folder The folder to move/copy from.
 * @param old_folder The folder to move/copy to.
 * @param file_list List describing how and what to copy.
 * @todo We need a better method of error handling other
 *       than just returning false.
 */
async function updateFolder(new_folder, old_folder, file_list, options) {
    const cwd = path.resolve();

    const context = {
        new_folder: path.resolve(cwd, new_folder),
        old_folder: path.resolve(cwd, old_folder)
    };

    if (!options['hash-algo']) {
        options['hash-algo'] = 'sha1';
    }

    let success =
        await file_list_cmp(
            file_list,
            context.new_folder,
            options['hash-algo']
        );

    if (!success) return false;

    success =
        await handle_filelist_file_copy(
            file_list,
            context.new_folder,
            context.old_folder
        );

    if (!success) return false;
}

module.exports = {
    updateFolder
}