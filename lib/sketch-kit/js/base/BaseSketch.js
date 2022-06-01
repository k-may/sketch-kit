import {BaseView} from './BaseView.js';

export class BaseSketch extends BaseView {

    /**
     *
     * @param className : string
     */
    constructor(className) {
        super(null, className);
    }

    /**
     * All rendering should be placed here. Tick durations are clamped to 60fps
     * @param time : number
     * @param deltaTime : number
     */
    draw({time, deltaTime}) {
    }

    /***
     * Override this for custom scroll. Defaults to element offsetHeight, then
     * double window height.
     *
     * @returns {number}
     */
    getHeight() {
        return this.el.offsetHeight || window.innerHeight;
    }

    /**
     * Called on window resize
     * @param width : number
     * @param height : number
     */
    onResize(width, height) {
    }


    /**
     * Attach to receive event
     * @param e : MouseEvent
     */
    onMouseMove(e) {
    }

    /**
     * Attach to receive event
     * @param e : MouseEvent
     */
    onMouseDown(e) {
    }

    /**
     * Attach to receive event
     * @param e : MouseEvent
     */
    onMouseUp(e) {
    }

    /**
     * Percentage of total scroll on page
     * @param percentage : number
     */
    onScroll(percentage) {
    }

    destroy() {
        this.el.remove();
    }
}
