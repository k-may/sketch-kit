export let LoadingUtils = {
    LoadAJAX: function(url) {
        return new Promise((resolve, reject) => {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function() {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    resolve(xmlhttp.responseText);
                }
            };

            xmlhttp.open('GET', url, true);
            xmlhttp.send();
        });
    },

    LoadSVG: function(url) {
        return new Promise((resolve, reject) => {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function() {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    resolve(xmlhttp.responseXML);
                }
            };

            xmlhttp.open('GET', url, true);
            xmlhttp.send();
        });
    },

    LoadJSON: function(url) {
        return new Promise(resolve => {
            LoadingUtils.LoadAJAX(url).then(data => {
                try {
                    var data = JSON.parse(data);
                } catch (err) {
                    reject(err.message + ' in ' + data);
                    return;
                }
                resolve(data);
            });
        });
    },

    LoadImages: function(imgs) {
        var promises = [];
        imgs.forEach(src => {
            promises.push(this.LoadImage(src));
        });
        return Promise.all(promises);
    },

    LoadImage: function(src) {
        return new Promise((resolve, reject) => {
            if (!src) {
                reject('LoadingUtils : img null');
            } else {
                var img = new Image();
                img.onload = function() {
                    img.onload = null;
                    resolve(img);
                };
                img.onerror = function(e) {
                    reject(e.message);
                };
                img.src = src;
            }
        });
    },

    LoadShader: function(src) {
        return new Promise(function(resolve) {
            var xhr = new XMLHttpRequest();
            xhr.addEventListener('load', function(e) {
                resolve(e.currentTarget.responseText);
            });
            xhr.open('GET', src);
            xhr.send();
        });
    },

    LoadShaders: function(src) {
        return new Promise(resolve => {
            var promises = [];
            for (var i = 0; i < src.length; i++) {
                promises.push(this.LoadShader(src[i]));
            }
            Promise.all(promises).then(shaders => {
                //TODO add mobile detection..
                /*if(Modernizr.touchevents) {
                    for (var i = 0; i < shaders.length; i++) {
                        shaders[i] = "#define MOBILE\n" + shaders[i];
                    }
                }*/

                resolve(shaders);
            });
        });
    }
};
