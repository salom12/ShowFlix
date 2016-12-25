const Q = require("q");
const colors = require('colors');
const filedownloader = require("filedownloader");


function download(url, infos, index) {
    return Q.Promise((resolve, reject) => {
        let defer = Q.defer(),
            fileDowns = global.fileDowns,
            filename = `${infos.name} s${infos.season}e${infos.episode}.mp4`;

        if(!url){
            console.log("No stream found".red);
            reject();
        }

        if (index === undefined) {
            index = fileDowns.length;
            fileDowns.push({
                episode: infos.episode,
                season: infos.season,
                started: false,
                progress: {},
                error: false,
                finished: false
            })
        }

        new filedownloader({
            url: url,
            saveas: filename,
            saveto: global.SAVETOFOLDER,
            deleteIfExists: true
        }).on("start", () => {
            fileDowns[index].started = true;
            fileDowns[index].error = false;
            fileDowns[index].finished = false;

            console.log(`Started ${filename}`.green)

        }).on("progress", (pr) => {
            process.stdout.clearLine(); // clear current text
            process.stdout.cursorTo(0);
            process.stdout.write(`${pr.progress}%`.blue + " Downloaded".green);
            if (pr.progress === 100) {
                console.log("");
            }

            fileDowns[index].progress = {
                progress: pr.progress,
                written: byteToMB(pr.dataWritten),
                size: byteToMB(pr.filesize),
                speed: pr.speed
            };
        }).on("end", () => {
            resolve();

            fileDowns[index].finished = true;

        }).on("error", err => {
            fileDowns[index].error = true;
            console.log(err.red);
            reject(index);
        })
    });
}

function byteToMB(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + 'MB';
}

module.exports = { download };