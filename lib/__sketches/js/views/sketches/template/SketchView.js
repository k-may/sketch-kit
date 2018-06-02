import {BaseSketch} from "../../BaseSketch";

export class SketchView extends BaseSketch {

    constructor() {
        super();
        this.className = '{sketchname}';
    }

    initialize(options) {
        BaseSketch.prototype.initialize.call(this, options);
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