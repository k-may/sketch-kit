import {BaseView} from "./BaseView.js";

export class BaseSketch extends BaseView{

    constructor(className) {
        super(null, className);
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