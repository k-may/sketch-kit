export class BaseSketch{

    constructor() {
        this.className = 'sketch';
    }

    initialize(options) {
        this.on('resize', this.onResize.bind(this));
    }

    initialized() {
        window.dispatchEvent(new Event('resize'));
    }

    draw(time) {
    }

    /***
     * Override this for custom scroll. Defaults to element offsetHeight, then
     * double window height.
     *
     * @returns {number}
     */
    getHeight() {
        return this.el.offsetHeight || window.innerHeight * 2;
    }


    /**
     *
     * @param args (Array) : [width, height]
     * @private
     */
    onResize(args) {
    }

}