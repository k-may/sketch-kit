import {RenderUtils} from "../utils/RenderUtils";

export class BaseSketch extends HTMLElement {

    /**
     *
     * @param className : string
     */
    constructor() {
        self = super();
        this.el = self;
    }

    async init(){
    }

    connectedCallback() {

        if (!this._initialized) {
            this.initialized = true;
            this.init().then(() => {
                window.dispatchEvent(new Event('resize'));

                this.resizeObserver = this.resizeObserver || new ResizeObserver(this.onResize.bind(this));
                this.resizeObserver.observe(this.el);

                this.loop = this.loop || RenderUtils.loop(this.draw.bind(this));
                this.loop.start();
            });
        }else{
            this.resizeObserver.observe(this.el);
            this.loop.start();
        }


    }

    discponnectedCallback() {
        console.log('disconnected', this)
        this.loop?.stop();
        this.resizeObserver?.disconnect();
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
    onResize() {
        console.log('resize');
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
     * Scroll event
     * @param scrollY
     * @param percentage
     */
    onScroll(scrollY, percentage) {
    }

    destroy() {
        this.el.remove();
    }
}
