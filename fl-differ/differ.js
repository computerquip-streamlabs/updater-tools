/**
 * This compares a file list with another file list in order
 * to generate a new list. Note that the order you specify
 * matters! For example, asking how the letter A is different
 * from the letter B would result in a different response than
 * if you asked how the letter B was different from the letter A.
 *
 * In this case, the second parameter you specify will act as
 * the file list you want to move to. Essentially, it's making
 * a patch that goes from the first parameter to the second
 * parameter.
 */
function generateDiffList(file_list, new_file_list, options, callback) {
    for (const file in new_file_list) {
        const add_file =
            !file_list.hasOwnProperty(file) ||
            file_list[file] !== new_file_list[file];

        if (add_file) callback(file, new_file_list[file]);
    }

    /* In order to detect deleted files, we need to iterate
     * through both file lists. */
    for (const file in file_list) {
        const add_delete_entry =
            !new_file_list.hasOwnProperty(file);

        if (add_delete_entry) callback(file, null);
    }
}

module.exports = {
    generateDiffList
}