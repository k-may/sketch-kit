import {BaseView} from "../BaseView.js";

export class MenuView extends BaseView{

    constructor(el, config) {
        super(el, 'menu');
        this.sketch = null;
        this.config = config;
        this._start();
    }

    //-----------------------------------------

    _start() {

        //create menu
        var list = document.createElement('ul');
        list.setAttribute('class', 'menu_cont');

        var button = document.createElement('button');

        list.appendChild(button);

        for (var key in this.config) {
            var item = document.createElement('li');
            item.setAttribute('id', key);
            item.innerHTML = key;
            list.appendChild(item);
        }

        this.el.onclick = function (e) {
            //console.log(e);
            location.hash = '#' + e.target.innerHTML;
        };

        this.el.appendChild(list);

    }
}