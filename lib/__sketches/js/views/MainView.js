import {Utils} from "../utils/Utils.js";
import {LoadingUtils} from "../utils/LoadingUtils";

export class MainView extends View{

    constructor() {

        super();

        this._expanderEl = null;
        this._sketch = null;
        this._cachedSketches = {};
        this.config = {};
        this._menuView = {};

        this._scrollTo = 0;
        this._destScrollTo = 0;

        this.el = document.createElement("div");

        this.DEFAULT_SKETCH = '';

        this._gui = null;
    }

    //---------------------------------------------------

    /***
     * Load config.json and create menu
     */
    initialize() {

        Utils.LoadAJAX('data/config.json').then(data => {
            console.log('sketches :: ', data);
            this.config = data.sketches;
            this._start();
        });
    }

    /***
     * Update current sketch and smooth scroll
     * @param time
     */
    draw(time) {
        if (this._sketch) this._sketch.draw(time);

        //update smooth scroll
        if (this._expanderEl) {
            this._scrollTo +=
                (this._destScrollTo - this._scrollTo) * 0.1;
            var sP = 1.0 - (window.innerHeight - this._scrollTo) / window.innerHeight;

            if (this._sketch && this._sketch.onScroll)
                this._sketch.onScroll(sP);
        }
    }

    /***
     * Set sketch by sketch id. Will instantiate sketch if not cached
     * @param sketchId
     */
    setSketch(sketchId) {
        var isValid = this.config.hasOwnProperty(sketchId);
        sketchId = isValid ? sketchId : this.DEFAULT_SKETCH;

        if (this._sketch) {
            if (this._sketch.id === sketchId) {
                return;
            }

            //clear gui
            this._clearGUI();

            //sketch id added to dom for custom scss
            this.el.classList.remove(this._sketch.id);
            this._sketch.el.remove();
        }

        var self = this;
        this._getSketchClass(sketchId).then(sketch => {
            sketch.id = sketchId;
            sketch.params = this.config[sketchId].params;
            self.addSketch(sketch);
        });
    }

    /***
     * Adds sketch view to dom.
     * @param sketch
     */
    addSketch(sketch) {
        this._sketch = sketch;

        if (sketch.params) {
            this._setGUI(sketch.params);
        }

        var sketchId = this._sketch.id;
        this._cachedSketches[sketchId] = this._sketch;

        this.el.classList.add(sketchId);
        this.el.appendChild(this._sketch.el);
        location.hash = '#' + sketchId;

        //update menu
        if (this._menuView) {
            var lists = document.getElementsByTagName('li');
            for (var i = 0; i < lists.length; i++) {
                lists[i].classList.remove('active');
            }
            var listItem = document.getElementById(sketchId);
            listItem.setAttribute('class', 'active');
        }

        this._onResize(null);
        this._onScroll(null);
    }

    //---------------------------------------------------

    /**
     * Setups events and loads default sketch
     * @private
     */
    _start() {
        this._menuView = new MenuView(
            document.getElementsByClassName('menu-view')[0]
        );
        this.el.appendChild(this._menuView.el);

        for (var key in this.config) {
            this.DEFAULT_SKETCH = key;
            break;
        }

        this._setupScroll();
        this._setupWindow();
        this._onHashChange();
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
        if (this._sketch)
            this._sketch.trigger('resize', [
                window.innerWidth,
                window.innerHeight
            ]);
        this._expanderHeight = this._sketch.getHeight();
        this._expanderEl.style.height = this._expanderHeight + 'px';
    }

    _onScroll() {
        this._destScrollTo = window.scrollY;
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
        var sketchId = location.hash.split('#')[1] || this.DEFAULT_KEY;
        this.setSketch(sketchId);
    }

    /***
     * Retrieve sketch class, instantiate and return.
     * @param sketchId Folder Name of sketch
     * @returns {Promise}
     * @private
     */
    _getSketchClass(sketchId) {
        return new Promise((resolve, reject) => {
            if (sketchId) {
                if (this._cachedSketches.hasOwnProperty(sketchId)) {
                    resolve(this._cachedSketches[sketchId]);
                } else {
                    var path =
                        'views/sketches/' + this.config[sketchId].view;
                    LoadingUtils.LoadClass([path], function () {
                        resolve(new this.config[sketchId].view());
                    });
                }
            } else {
                reject(
                    'No sketches!\n Use \'sketches create\' to generate a sketch'
                );
            }
        });
    }

    /***
     * Sets dat.gui params if configurated in config.json
     * @param params
     * @private
     */
    _setGUI(params) {
        this._gui = new dat.GUI();

        for (var key in params) {
            var value = params[key];
            if (params[key] !== undefined) {
                if (Array.isArray(value) && value.length > 1) {
                    if (value.length == 2)
                        this._gui.add(this._sketch, key).min(value[0]).max(value[1]).listen();
                } else
                    this._gui.add(this._sketch, key, value).listen();
            } else {
                console.error(
                    'Sketch "' +
                    sketch.id +
                    '" has no property "' +
                    key +
                    '"'
                );
            }
        }
    }

    /***
     * Clear controllers from gui and destroy element
     * @private
     */
    _clearGUI() {
        if (this._gui) {
            this._gui.destroy();
            this._gui = null;
        }
    }
}
