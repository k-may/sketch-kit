/* eslint-disable */
define(
    ['superhero', 'dat.gui', '../utils/Utils', 'views/components/MenuView'],
    function(Superhero, dat, utils, MenuView) {
        return Superhero.View.extend({
            _expanderEl: null,
            _sketch: null,
            _cachedSketches: {},
            _sketches: {},
            _menuView: {},

            _scrollTo: 0,
            _destScrollTo: 0,

            DEFAULT_SKETCH: '',

            _gui: null,

            //---------------------------------------------------

            /***
             * Load config.json and create menu
             */
            initialize: function() {
                utils.LoadAJAX('data/config.json').then(data => {
                    console.log('sketches :: ', data);
                    this._sketches = data.sketches;
                    this._start();
                });
            },

            /***
             * Update current sketch and smooth scroll
             * @param time
             */
            draw: function(time) {
                if (this._sketch) this._sketch.draw(time);

                //update smooth scroll
                if (this._expanderEl) {
                    this._scrollTo +=
                        (this._destScrollTo - this._scrollTo) * 0.1;
                    var sP = 1.0 - (window.innerHeight - this._scrollTo) / window.innerHeight;

                    if (this._sketch && this._sketch.onScroll)
                        this._sketch.onScroll(sP);
                }
            },

            /***
             * Set sketch by sketch id. Will instantiate sketch if not cached
             * @param sketchId
             */
            setSketch: function(sketchId) {
                var isValid = this._sketches.hasOwnProperty(sketchId);
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
                    sketch.params = this._sketches[sketchId].params;
                    self.addSketch(sketch);
                });
            },

            /***
             * Adds sketch view to dom.
             * @param sketch
             */
            addSketch: function(sketch) {
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
            },

            //---------------------------------------------------

            /**
             * Setups events and loads default sketch
             * @private
             */
            _start: function() {
                this._menuView = new MenuView(
                    document.getElementsByClassName('menu-view')[0]
                );
                this.el.appendChild(this._menuView.el);

                for (var key in this._sketches) {
                    this.DEFAULT_SKETCH = key;
                    break;
                }

                this._setupScroll();
                this._setupWindow();
                this._onHashChange();
            },

            /***
             * Adds smooth scroll to page
             * @private
             */
            _setupScroll: function() {
                this._expanderEl = document.createElement('div');
                this._expanderEl.setAttribute('class', 'expander');
                document.body.appendChild(this._expanderEl);
            },

            _setupWindow: function() {
                window.onmousedown = this._onMouseDown.bind(this);
                window.onmouseup = this._onMouseUp.bind(this);
                window.onclick = this._onClick.bind(this);
                window.onresize = this._onResize.bind(this);
                window.onscroll = this._onScroll.bind(this);
                window.onhashchange = this._onHashChange.bind(this);
                window.onmousemove = this._onMouseMove.bind(this);
            },

            _onClick: function(e) {
                if (this._sketch && this._sketch.onClick)
                    this._sketch.onClick(e);
            },

            _onResize: function() {
                if (this._sketch)
                    this._sketch.trigger('resize', [
                        window.innerWidth,
                        window.innerHeight
                    ]);
                this._expanderHeight = this._sketch.getHeight();
                this._expanderEl.style.height = this._expanderHeight + 'px';
            },

            _onScroll: function() {
                this._destScrollTo = window.scrollY;
            },

            _onMouseMove: function(e) {
                if (this._sketch && this._sketch.onMouseMove)
                    this._sketch.onMouseMove(e);
            },

            _onMouseDown: function(e) {
                if (this._sketch && this._sketch.onMouseDown)
                    this._sketch.onMouseDown(e);
            },

            _onMouseUp: function(e) {
                if (this._sketch && this._sketch.onMouseUp)
                    this._sketch.onMouseUp(e);
            },

            _onHashChange: function() {
                var sketchId = location.hash.split('#')[1] || this.DEFAULT_KEY;
                this.setSketch(sketchId);
            },

            /***
             * Retrieve sketch class, instantiate and return.
             * @param sketchId Folder Name of sketch
             * @returns {Promise}
             * @private
             */
            _getSketchClass: function(sketchId) {
                return new Promise((resolve, reject) => {
                    if (sketchId) {
                        if (this._cachedSketches.hasOwnProperty(sketchId)) {
                            resolve(this._cachedSketches[sketchId]);
                        } else {
                            var path =
                                'views/sketches/' + this._sketches[sketchId].view;
                            require([path], function(Class) {
                                resolve(new Class());
                            });
                        }
                    } else {
                        reject(
                            'No sketches!\n Use \'sketches create\' to generate a sketch'
                        );
                    }
                });
            },

            /***
             * Sets dat.gui params if configurated in config.json
             * @param params
             * @private
             */
            _setGUI: function(params) {
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
            },

            /***
             * Clear controllers from gui and destroy element
             * @private
             */
            _clearGUI: function() {
                if (this._gui) {
                    this._gui.destroy();
                    this._gui = null;
                }
            }

        });
    }
);
