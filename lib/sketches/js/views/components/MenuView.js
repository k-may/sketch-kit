define(['superhero',
        '../../utils/Utils'],

    function(Superhero,
             utils) {

        return Superhero.View.extend({

            className: 'menu',
            sketch: null,
            _sketches: {},

            initialize: function() {

                utils.LoadAJAX('data/config.json').then((data) => {
                    this._sketches = data.sketches;
                    this._start();
                });

            },

            draw: function() {

            },

            //-----------------------------------------

            _start: function() {

                //create menu
                var list = document.createElement('ul');
                list.setAttribute('class', 'menu_cont');

                var button = document.createElement('button');

                list.appendChild(button);

                for (var key in this._sketches) {
                    var item = document.createElement('li');
                    item.setAttribute('id', key);
                    item.innerHTML = key;
                    list.appendChild(item);
                }

                this.el.onclick = function(e) {
                    //console.log(e);
                    location.hash = '#' + e.target.innerHTML;
                };

                this.el.appendChild(list);

            },

        });


    });