const Ev = require("events");
const util = require('util');
const utils = require("../utils/utils");
const config = require("./config");
const _ = require("underscore");

function Watcher(arr, delay, queue) {
    this.last = [];
    setInterval(() => {
    	if(queue) arr = utils.getQueueSync(config("QUEUEPATH"));
        const deff = utils.arrayDeffrence(arr, this.last);

        if (deff.length > 0) {
            this.last = _.map(arr, _.clone);
            this.emit("changed", arr);
        }
    }, delay);
}

util.inherits(Watcher, Ev);

module.exports = Watcher;