var fs = require('fs-extra');
var U = require('./update');

class Sketch {

    //TODO add clean task

    constructor() {

        this.config = {
            "root": "sketches",
            "sass": {
                "src": "scss/",
                "dest": "css/",
                "entry": "main.scss"
            }
        };

    }

    //----------------------------------------------------

    /**
     * Prompts for info and appends new sketch to sketches
     */
    create(args) {

        this.update().then(() => {
            if (this._IsInitialized()) {
                var Create = require("./create");
                new Create(this.config, args);
            } else {
                console.log("Sketches not initialized!\n");
                console.log("Please run 'sketch-kit init' first.");
            }
        });
    }

    /**
     * Initiates sketches with application folder and build tasks
     */
    init() {
        var Init = require('./init');
        new Init(this.config);
    }

    /**
     * Copies ness deps
     *
     * @returns {Promise}
     */
    update() {

        return new Promise((resolve, reject) => {

            if (this._IsInitialized()) {
                var update = new U(this.config);
                update.start().then(() => {
                    resolve();
                });
            } else {
                console.log("Sketches not initialized!\n");
                console.log("Please run 'sketch-kit init' first.");
                reject();
            }
        });
    }

    /**
     * Runs gulp taks for project (sass, webpack, serve)
     */
    run(args) {
        this.update().then(() => {
            var Run = require('./run');
            new Run(this.config, args);
        }).catch((e) => {
            console.log("Run error : " + e.message);
        });
    }

    //-----------------------------------------------------

    /***
     * Check if sketches folder has been created.
     *
     * @returns {boolean}
     * @private
     */
    _IsInitialized() {

        if (fs.existsSync('./sketches')) {
            return true;
        }

        return false;
    }
}

module.exports = Sketch;