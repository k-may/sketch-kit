var fs = require('fs-extra');

module.exports = {

    loadConfig: function () {

        return new Promise((resolve, reject) => {

            fs.readFile('./sketch-kit/config.json', 'utf8', (err, config) => {
                if(err){
                    fs.readFile('./sketch-kit/data/config.json', 'utf8', (err, config) => {
                        resolve({ config : JSON.parse(config), path: './sketch-kit/data/config.json'});
                });
                }else
                    resolve({ config : JSON.parse(config), path: './sketch-kit/config.json'});
            });

        });
    }
}