const utils = require("../utils/utils");
const Q = require("q");

const providers = {};

function add(arr) {
    if (arr.constructor === Array) {
        arr.forEach(val => {
            providers[val] = require(`./${val}`);
        });
    }
}

function get(name) {
    return providers[name];
}

add(["openload", "keeload", "Uptobox", "top4top", "googleDrive"]);

module.exports = {
    add,
    get
};
