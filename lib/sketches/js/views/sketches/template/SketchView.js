/* eslint-disable */
define(['../../BaseSketch'], function(BaseSketch) {

    return BaseSketch.extend({

        className: '{sketchname}',

        initialize: function(options) {
            BaseSketch.prototype.initialize.call(this, options);
        },

        draw: function(time) {
            //put animation frame code here
        },

        /**
         * Overrides
         *
         * @param args (Array) : [width, height]
         * @private
         */
        onResize: function(args) {
        },

        onScroll: function(percentage) {
        },

        onClick: function(e) {
        },

        onMouseMove: function(e) {
        },

        onMouseUp: function() {
        },

        onMouseDown: function() {
        },

    });

});