import {BaseSketch} from "../../BaseSketch.js";

export default class SketchView extends BaseSketch {

    constructor() {
        super('{sketchname}');
    }

    draw(time) {
        //put animation frame code here
    }

    /**
     * Overrides
     *
     * @param args (Array) : [width, height]
     * @private
     */
    onResize(args) {
    }

    onScroll(percentage) {
    }

    onClick(e) {
    }

    onMouseMove(e) {
    }

    onMouseUp() {
    }

    onMouseDown() {
    }

}