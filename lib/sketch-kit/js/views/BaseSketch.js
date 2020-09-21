import {BaseView} from "./BaseView.js";

export class BaseSketch extends BaseView{

    constructor(className) {
        super(null, className);
    }

    draw({time, deltaTime}) {
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
     * Called on window resize
     * @param width
     * @param height
     */
    onResize(width, height) {
    }


    /**
     * Attach to receive event
     * @param e
     */
    onMouseMove(e){}

    /**
     * Attach to receive event
     * @param e
     */
    onMouseDown(e){}

    /**
     * Attach to receive event
     * @param e
     */
    onMouseUp(e){}

    /**
     * Percentage of total scroll on page
     * @param percentage
     */
    onScroll(percentage){}

}