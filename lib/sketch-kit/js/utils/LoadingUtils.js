export let LoadingUtils = {

    LoadAJAX: function (url) {
        return new Promise((resolve, reject) => {

            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    resolve(xmlhttp.responseText);
                }
            };

            xmlhttp.open("GET", url, true);
            xmlhttp.send();

        });
    },

    LoadJSON: function (url) {
        return new Promise(resolve => {

            LoadingUtils.LoadAJAX(url).then(data => {

                try {
                    var data = JSON.parse(data);
                } catch (err) {
                    reject(err.message + " in " + data);
                    return;
                }
                resolve(data);

            })
        });
    },

    LoadImages: function (imgs) {
        var promises = [];
        imgs.forEach(src => {
            promises.push(this.LoadImage(src));
        });
        return Promise.all(promises);
    },

    LoadImage: function (src) {
        return new Promise((resolve, reject) => {
            var img = new Image();
            img.onload = function () {
                img.onload = null;
                resolve(img);
            };
            img.src = src;
        });
    },

    LoadShader: function (src) {
        return new Promise(function (resolve) {
            var xhr = new XMLHttpRequest();
            xhr.addEventListener('load', function (e) {
                resolve(e.currentTarget.responseText);
            });
            xhr.open('GET', src);
            xhr.send();
        });
    },

    LoadShaders: function (src) {

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
    },

    LoadClass: function (url, Class) {

        return new Promise(resolve => {
            eval('import SketchView from "' + url + '"');

            var node = document.createElement("script");
            node.setAttribute("type", 'module');
            node.setAttribute("language", "JavaScript");
            node.charset = 'utf-8';
            node.setAttribute("src", url);

            node.addEventListener('load', function (evt) {
                if (evt.type === 'load' ||
                    (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {

                    node = evt.currentTarget || evt.srcElement;

                    //Pull out the name of the module and the context.
                    resolve(node);
                }
            });
            // Now add this new element to the head tag
            document.getElementsByTagName("head")[0].appendChild(node);


        });
    }
};

