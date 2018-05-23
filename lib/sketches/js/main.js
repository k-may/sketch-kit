/* eslint-disable no-undef,no-unused-vars */
requirejs.config({
    baseDir: 'js',
    paths: {
        'sylvester': 'vendor/sylvester.src',
        'lodash': 'vendor/lodash',
        'three': 'vendor/three',
        'dat.gui': 'vendor/dat.gui',
        'text': 'vendor/text'
    },
    shim: {
        'lodash': {
            exports: '_'
        },
        'sylvester': {
            exports: function() {
                var global = this.Sylvester;
                delete this.Sylvester;

                return global;
            }
        },
        'three': {
            'exports': 'THREE'
        },
        'dat.gui': {
            'exports': 'dat'
        }
    }
});

//todo add gl-mat4 lib (better than sylvester?)

require(['views/MainView', 'three'], function(MainView) {

    var mainView = new MainView({el: document.getElementsByClassName('js-region-main')[0]});

    function draw() {
        window.requestAnimationFrame(draw);
        var time = window.performance.now();
        mainView.draw(time);

    }

    draw();

});
