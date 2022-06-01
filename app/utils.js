var fs = require('fs-extra');
const path = require('path');
const replace = require('replace');

const utils = {

    defaultConfigFile: 'sketch-kit.config.json',

    getConfigFilePath: (configFile) => {
        const publicDir = path.resolve(process.cwd(), 'sketch-kit');
        if (configFile !== utils.defaultConfigFile) {
            let configFilePath = path.join(publicDir, configFile)
            if (!fs.existsSync(configFilePath)) {
                utils.message(`Config file ${configFilePath} not found, using default`);
                configFile = utils.defaultConfigFile;
            }else {
                return configFile;
            }
        }

        configFilePath = path.join(publicDir, configFile)
        if (!fs.existsSync(configFilePath)) {

            //finally check for previous version..
            configFile = 'config.json';
            configFilePath = path.join(publicDir, configFile)
            if (!fs.existsSync(configFilePath)) {
                configFile = null;
                throw new Error("No config file found")
            }
        }

        utils.message(`Using config file ${configFile}`);

        return configFile;
    },

    loadConfig: function (configFile) {

        return new Promise((resolve, reject) => {

            const configFilePath = './sketch-kit/' + configFile;
            fs.readFile(configFilePath, 'utf8', (err, config) => {
                if (err) {
                    fs.readFile('./sketch-kit/data/config.json', 'utf8', (err, config) => {
                        resolve({config: JSON.parse(config), path: './sketch-kit/data/config.json'});
                    });
                } else
                    resolve({config: JSON.parse(config), path: configFilePath});
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
    },

    log: function (msg) {
        console.log('\n\x1b[33mSK ::\x1b[1m %s \x1b[0m', msg);
    },

    message: function(msg){
        console.log('\x1b[33mSK :: %s \x1b[0m', msg);
    }
}

module.exports = utils;
