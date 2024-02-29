import {RenderUtils} from "../utils/RenderUtils";
function generateDeferredPromise() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        [resolve, reject] = [res, rej];
    });
    return {promise, reject, resolve};
}
export class BaseSketch extends HTMLElement {


    _initialized = false;
    _initDeferred = generateDeferredPromise();

    /**
     *
     * @param className : string
     */
    constructor() {
        self = super();
        this.el = self;
    }

    /**
     * Setup, initialize and load any dependences for your sketch
     * @abstract
     * @returns {Promise<void>}
     */
    async init(){
    }

    connectedCallback() {

        if (!this._initialized) {
            this._initialized = true;
            this.init().then(() => {

                window.dispatchEvent(new Event('resize'));

                this.resizeObserver = this.resizeObserver || new ResizeObserver(this.onResize.bind(this));

                this.loop = this.loop || RenderUtils.loop(this.draw.bind(this));
                this._initDeferred.resolve();
            });
        }

        this._start()
    }

    disconnectedCallback() {
        this._stop();
    }

    _start(){
        this._initDeferred.promise.then(() => {
            this.resizeObserver.observe(this);
            this.loop.start();
        });
    }

    _stop(){
        this.loop?.stop();
        this.resizeObserver?.disconnect();
    }

    /**
     * All rendering should be placed here. Tick durations are clamped to 60fps
     * @abstract
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
