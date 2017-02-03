const Q = require("q")
const request = require("request")
const cheerio = require("cheerio")
const fs = require("fs");
const colors = require("colors");
const del = require("del");
const _ = require("underscore");
const extend = require("extend");
const path = require("path");
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 60 * 60 * 24, checkperiod: 120 });

function getHtml(url, json, cookies) {
    return Q.Promise((resolve, reject) => {
        var defer = Q.defer();
        url = encodeURI(url);
        request(url, (error, response, body) => {
            if (error || response.statusCode !== 200) { _log(error, error || response.statusCode, body, url) }
            if (!error && response.statusCode == 200) {
                if (json) {
                    resolve(body);
                } else {
                    const $ = cheerio.load(body);
                    resolve((!cookies) ? $ : { $: $, cookies: parseCookies(response) });
                }
            } else {
                console.log("Error occured when requesting this url".red);
                reject("Error occured when requesting this url")
            }
        });
    })
}

function cache() {
    return {
        get: key => {
            return myCache.get(key);
        },
        set: (key, data) => {
            myCache.set(key, data);
        },
        delete: key => {
            myCache.del(key);
        }
    }
}

function filesUpdated() {
    cache().delete("medias")
}

function parseCookies(res) {
    let list = [],
        rc = res.headers['set-cookie'];

    rc && rc.forEach(cookie => {
        let parts = cookie.split(";")[0];
        list.push(parts);
    })

    return list;
}

function getInfosData(INFOS_PATH) {
    delete require.cache[require.resolve(INFOS_PATH)];
    return require(INFOS_PATH);
}


function UpdateInfosData(obj, INFOS_PATH, cb) {
    const OldData = getInfosData(INFOS_PATH);
    updateJSON(extend(OldData, obj), INFOS_PATH, cb);
}


function BuildNextElement(infos, INFOS_PATH, QUEUEPATH, cb) {
    let queueData = getQueueSync(QUEUEPATH),
        result = queueData.filter(item => !item.done);

    infos.queue = ('' + (parseInt(infos.queue) + 1));
    if(parseInt(infos.queue) > (queueData.length - 1) && result.length > 0) infos.queue = "0";

    UpdateInfosData(infos, INFOS_PATH, () => {
        cb(infos);
    });
}

function ElementDone(QUEUEPATH, index) {
    return Q.Promise((resolve, reject) => {
        getQueue(QUEUEPATH).then(data => {
            data[index].done = true;
            updateJSON(data, QUEUEPATH, () => {
                resolve();
            })
        }).catch(() => { reject() })
    })
}

function addToQueue(QUEUEPATH, arr, done) {
    getQueue(QUEUEPATH, true).then(data => {
        for (let i = arr.length - 1; i >= 0; i--) {
            const val = arr[i],
                result = data.filter(val1 => (val1.episode === val.episode && val1.season === val.season) && val1.name === val.name);
            if (result.length > 0) {
                arr.splice(i, 1);
            }

        }

        data = data.concat(arr);
        updateJSON(data, QUEUEPATH, () => {
            if (done)
                done();
        })
    })
}

function updateJSON(object, path, done) {
    fs.writeFile(path, JSON.stringify(object, null, 3), function(err) {
        if (err) return console.log(err, true);
        if (done)
            done()
    });
}

function ObjectSize(object) {
    let size = 0;
    for (key in object) {
        if (object.hasOwnProperty(key))
            ++size;
    }
    return size;
}

function deleteFile(uri) {
    return Q.Promise((resolve, reject) => {
        fs.exists(uri, (err, exists) => {
            if (err || !exists) reject("This File does not exist");

            del(uri, { force: true }).then(() => { resolve() }).catch(err => { reject(err) });
        })
    })
}

function arrayDeffrence(array) {
    var rest = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));

    var containsEquals = function(obj, target) {
        if (obj == null) return false;
        return _.any(obj, function(value) {
            return _.isEqual(value, target);
        });
    };

    return _.filter(array, function(value) {
        return !containsEquals(rest, value);
    });
}

function getQueue(QUEUEPATH, force = false) {
    return Q.Promise((resolve, reject) => {
        if (!fs.existsSync(QUEUEPATH)) {
            console.log("Unable to find queue data".red);
            return reject();
        } else {

            delete require.cache[require.resolve(QUEUEPATH)];
            const data = require(QUEUEPATH);

            if (ObjectSize(data) <= 0 && !force) {
                console.log("Data is empty please try again.".red);
                return reject("Data is empty please try again.");
            }

            resolve(data);
        }
    })
}

function getQueueSync(QUEUEPATH) {
    if (!fs.existsSync(QUEUEPATH)) return [];
    delete require.cache[require.resolve(QUEUEPATH)];
    return require(QUEUEPATH);
}

function getQueueValue(QUEUEPATH, index) {
    return Q.Promise((resolve, reject) => {
        getQueue(QUEUEPATH).then(data => {
            const arr = data.filter((val, key) => key === index);
            if (arr.length > 0) { resolve(arr[0]) } else { reject(); }
        }).catch(err => { reject(err) });
    })
}

function clearQueue(QUEUEPATH, cb) {
    getQueue(QUEUEPATH).then(data => {
        const newArr = [];
        _.each(data, (val, key) => {
            if (!val.done) newArr.push(val);
        });
        updateJSON(newArr, QUEUEPATH, () => {
            if (cb)
                cb()
        })
    }).catch(err => {
        if (cb) cb(err)
    });
}

function searchAPI(cx) {
    return require("../modules/searchAPI")(cx);
}

function updateConfig(obj, queuepath, cb) {
    updateJSON(obj, queuepath, cb);
}

function fixInt(num) {
    return isNaN(parseInt(num)) ? null : parseInt(num);
}

function deleteFromQueue({ episode, season, name }, queuepath) {
    return Q.Promise((resolve, reject) => {
        getQueue(queuepath, true).then(data => {
            for (let i = data.length - 1; i >= 0; i--) {
                const val = data[i];
                if(val.name === name && val.episode == episode && val.season == season){
                    data.splice(i, 1);
                }
            }
            
            updateConfig(data, queuepath, function (){
                resolve();
            });
        }).catch(err => {
            reject(err);
        });
    });
}

module.exports = {
    getHtml,
    BuildNextElement,
    addToQueue,
    ObjectSize,
    deleteFile,
    filesUpdated,
    arrayDeffrence,
    getQueueValue,
    ElementDone,
    clearQueue,
    searchAPI,
    getInfosData,
    UpdateInfosData,
    updateConfig,
    getQueue,
    getQueueSync,
    cache,
    fixInt,
    deleteFromQueue
}
