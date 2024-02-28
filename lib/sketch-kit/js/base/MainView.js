import {MenuView} from './components/MenuView.js';
import {BaseView} from './BaseView.js';
import config from "../../sketch-kit.config.json";

export class MainView extends BaseView {

    constructor(el) {
        super(el);
        this._expanderEl = null;
        this._sketch = null;
        this._cachedSketches = {};
        this.config = {};
        this._menuView = {};

        this._scrollTo = 0;
        this._destScrollTo = 0;

        this.DEFAULT_SKETCH = 'SketchKit';
    }

    //---------------------------------------------------

    /***
     * Load config.json and create menu
     */
    async initialize() {

        this.config = config;
        this.sketches = this.config.sketches;

        this._menuView = new MenuView(
            document.querySelector('nav'),
            this.sketches
        );

        for (var key in this.sketches) {
            this.DEFAULT_SKETCH = key;
            break;
        }

        this._setupScroll();
        this._setupWindow();
        this._onHashChange();
    }

    /***
     * Update current sketch and smooth scroll
     * @param time
     */
    draw({time, deltaTime}) {
        if (this._sketch) {
            //update smooth scroll
            if (this._expanderEl) {
                this._scrollTo +=
                    (this._destScrollTo - this._scrollTo) * 0.1;
                this._sketch.scrollRatio = this.getPercentage();
            }
        }
    }

    setSketch(sketchId) {

        sketchId = this.sketches[sketchId] ? sketchId : this.DEFAULT_SKETCH;

        if (this._sketch) {
            if (this._sketch.id === sketchId)
                return;

            this._sketch.destroy();

        }

        this._getSketch(sketchId).then(sketch => {
            try {
                this._addSketch(sketchId, sketch);
            } catch (e) {
                console.error("import error.", e);
            }
        });
    }

    //---------------------------------------------------

    _getSketch(sketchId) {

        return new Promise(resolve => {
            if (this._cachedSketches[sketchId]) {
                resolve(this._cachedSketches[sketchId]);
            } else {
                import(`../sketches/${sketchId}/${sketchId}.js`).then(module => {
                    // var sketch = module.default;
                    let name = "sk-" + sketchId.split(" ").join("-").toLowerCase()
                    try {
                        customElements.define(name, module.default,);
                    } catch (e) {
                        console.error("your browser does not support custom elements. Please use a modern browser.", e);
                    }
                    var sketch = document.createElement(name);
                    sketch.id = sketchId;
                    this._cachedSketches[sketchId] = sketch;
                    // sketch.id = sketchId;
                    // sketch.params = this.sketches[sketchId].params;
                    resolve(sketch);
                });
            }
        });
    }

    _addSketch(sketchId, sketch) {

        this._sketch = sketch;
        this._cachedSketches[sketchId] = this._sketch;

        this.el.appendChild(this._sketch);
        // }
        location.hash = '#' + sketchId;

        if (this._menuView) {
            var lists = document.getElementsByTagName('li');
            for (var i = 0; i < lists.length; i++) {
                lists[i].classList.remove('active');
            }
            var listItem = this._menuView.el.querySelector(`[data-id="${sketchId}"]`);
            if (listItem)
                listItem.classList.add('active');
        }
        /*
                this._onResize(null);
                this._onScroll(null);*/
    }

    /***
     * Adds smooth scroll to page
     * @private
     */
    _setupScroll() {
        this._expanderEl = document.createElement('div');
        this._expanderEl.setAttribute('class', 'expander');
        document.body.appendChild(this._expanderEl);
    }

    /**
     * Adds convienent window events
     * @private
     */
    _setupWindow() {
        window.onmousedown = this._onMouseDown.bind(this);
        window.onmouseup = this._onMouseUp.bind(this);
        window.onclick = this._onClick.bind(this);
        window.onresize = this._onResize.bind(this);
        window.onscroll = this._onScroll.bind(this);
        window.onhashchange = this._onHashChange.bind(this);
        window.onmousemove = this._onMouseMove.bind(this);
    }

    _onClick(e) {
        if (this._sketch && this._sketch.onClick)
            this._sketch.onClick(e);
    }

    _onResize() {
        if (this._sketch) {
            this._expanderHeight = this._sketch.getHeight();
            this._expanderEl.style.height = this._expanderHeight + 'px';
        }

    }

    _onScroll() {
        this._destScrollTo = window.scrollY;

        if (this._sketch) {
            let percentage = this.getPercentage();
            this._sketch.onScroll(window.scrollY, percentage);
            this._sketch.scrollRatio = percentage
        }
    }

    getPercentage() {
        return (this._scrollTo) / (this._expanderHeight - window.innerHeight);
    }

    _onMouseMove(e) {
        if (this._sketch && this._sketch.onMouseMove)
            this._sketch.onMouseMove(e);
    }

    _onMouseDown(e) {
        if (this._sketch && this._sketch.onMouseDown)
            this._sketch.onMouseDown(e);
    }

    _onMouseUp(e) {
        if (this._sketch && this._sketch.onMouseUp)
            this._sketch.onMouseUp(e);
    }

    _onHashChange() {
        var sketchId = location.hash.split('#')[1] || this.DEFAULT_SKETCH;
        if (sketchId)
            this.setSketch(sketchId);
    }

}
