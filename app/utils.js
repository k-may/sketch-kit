var fs = require('fs-extra');
const path = require('path');
const replace = require('replace');

module.exports = {

    loadConfig: function () {

        return new Promise((resolve, reject) => {

            fs.readFile('./sketch-kit/config.json', 'utf8', (err, config) => {
                if (err) {
                    fs.readFile('./sketch-kit/data/config.json', 'utf8', (err, config) => {
                        resolve({config: JSON.parse(config), path: './sketch-kit/data/config.json'});
                    });
                } else
                    resolve({config: JSON.parse(config), path: './sketch-kit/config.json'});
            });

        });
    },

    replaceNameInFile: function (regex, replacement, paths) {

        try {
            paths = Array.isArray(paths) ? paths : [paths];
            paths = paths.map(p => path.resolve(p));
            //replace all sketchnames throughout templates
            replace({
                regex,
                replacement,
                paths,
                recursive: true,
                silent: true,
            });
        } catch (e) {
            console.log('Replace error : ', e);
            console.log({regex, replacement, paths});
        }
    }
}
