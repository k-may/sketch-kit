import fs from 'fs-extra';
import path from 'path';
import replace from 'replace';

export const utils = {

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

        let configFilePath = path.join(publicDir, configFile)
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

    loadConfig: async function (configFile) {
        const configFilePath = path.resolve(process.cwd(), 'sketch-kit', configFile);
        try {
            const data = await fs.readFile(configFilePath, 'utf8');
            return { config: JSON.parse(data), path: configFilePath };
        } catch (err) {
            // fallback to legacy path
            const legacyPath = path.resolve(process.cwd(), 'sketch-kit', 'data', 'config.json');
            const legacyData = await fs.readFile(legacyPath, 'utf8');
            return { config: JSON.parse(legacyData), path: legacyPath };
        }
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
