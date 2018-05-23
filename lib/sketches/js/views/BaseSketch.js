/* eslint-disable */
define(['superhero'],

    function(Superhero) {

        return Superhero.View.extend({

            className: 'sketch',

            initialize: function(options) {
                this.on('resize', this.onResize.bind(this));
            },

            initialized: function() {
                window.dispatchEvent(new Event('resize'));
            },

            draw: function(time) {
            },

            /***
             * Override this for custom scroll. Defaults to element offsetHeight, then
             * double window height.
             *
             * @returns {number}
             */
            getHeight: function() {
                return this.el.offsetHeight || window.innerHeight * 2;
            },

            /**
             *
             * @param args (Array) : [width, height]
             * @private
             */
            onResize: function(args) {
            }

        });

    });