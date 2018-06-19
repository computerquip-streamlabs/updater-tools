const fs = require('fs');
const path = require('path');
const util = require('util');
const flg = require('fl-generator');

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);
const mkdir = util.promisify(fs.mkdir);
const lstat = util.promisify(fs.lstat);

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

async function handle_filelist_file_copy(file_list, from_folder, to_folder) {
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
        const filepath = path.resolve(to_folder, file);
        const file_to_copy = path.resolve(from_folder, file);

        if (file_list[file] === null) {
            await delete_file_maybe(filepath);
            continue;
        }

        await ensure_path(filepath);
        await writeFile(filepath, await readFile(file_to_copy));
    }
}

async function file_list_cmp(assumed_list, from_folder, hashAlgo) {
    /* Actual list here is used to account for
     * what files are actually in from_folder
     * rather than assuming the list that was
     * given to us is correct. */
    let actual_list = { };

    /* generateFileList wants an existing folder and will throw otherwise.
     * I think this is sane behavior since you generally don't want a file
     * list for something that doesn't exist. */
    let from_exists = false;
    try {
        const from_stat = await lstat(from_folder);

        if (!from_stat.isDirectory()) {
            throw Error(`${from_folder} isn't a directory!`);
        }

        from_exists = true;
    } catch(error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }

    if (from_exists) {
        const list_func = (key, value) => { actual_list[key] = value; }
        await flg.generateFileList(from_folder, { hashAlgo }, list_func);
    }

    for (const file in assumed_list) {
        if (assumed_list[file] === null) continue;

        /* Make sure each entry in the actual file list (which represents
         * the directory we're copying from) has an entry corresponding
         * to the file list given. This makes sure the file actually
         * exists. */
        if (!actual_list.hasOwnProperty(file)) {
            const file_list_path = path.resolve(from_folder, file);

            console.log(`File list specifies ${file} ` +
                        `but wasn't found in ${file_list_path}`);
            return false;
        }

        /* We now know that each file list has an entry with the
         * same key. We can now fetch the checksum to make sure
         * they're they same file. */
        if (assumed_list[file] !== actual_list[file]) {
            console.log(`File list specified checksum ${assumed_list[file]} but ` +
                        `file checksum is ${actual_list[file]}. Make sure ` +
                        `the same algorithm is used and the checksum given ` +
                        `in the file list is correct.`);
            return false;
        }
    }

    return true;
}

/*
 * @param to_folder The folder to move/copy from.
 * @param from_folder The folder to move/copy to.
 * @param file_list List describing how and what to copy.
 * @todo We need a better method of error handling other
 *       than just returning false.
 */
async function updateFolder(to_folder, from_folder, file_list, options) {
    const cwd = path.resolve();

    const context = {
        to_folder: path.resolve(cwd, to_folder),
        from_folder: path.resolve(cwd, from_folder)
    };

    if (options && !options['hashAlgo']) {
        options['hashAlgo'] = 'sha1';
    }

    /* Check our temporary files for correctness. */
    let success =
        await file_list_cmp(
            file_list,
            context.from_folder,
            options['hashAlgo']
        );

    if (!success) return false;

    success =
        await handle_filelist_file_copy(
            file_list,
            context.from_folder,
            context.to_folder
        );

    if (!success) return false;
}

module.exports = updateFolder;