import {BaseView} from '../BaseView.js';

export class MenuView extends BaseView{

    constructor(el, sketches) {
        super(el, 'menu');
        this.sketch = null;
        this.sketches = sketches;
        this._start();
    }

    //-----------------------------------------


    _start() {

        var button = document.createElement('button');
        this.el.appendChild(button);

        const roots = this._constructTree(this.sketches);

        const listEl = document.createElement('ul');
        this._buildBranch(roots, listEl);
        this.el.appendChild(listEl);

        this.el.onclick = function (e) {
            location.hash = '#' + e.target.dataset['id']
        };

    }

    _buildBranch = (list, listEl) => {

        list.forEach(child => {

            const entryEl = document.createElement('li');
            entryEl.dataset["id"] = child.name;
            entryEl.innerHTML = child.name;

            if (child.children && child.children.length) {
                const listEl = document.createElement('ul');
                this._buildBranch(child.children, listEl);
                entryEl.appendChild(listEl);
            }

            listEl.appendChild(entryEl);
        })

    }

    _constructTree(sketches) {

        const roots = [];
        const map = {};
        const list = Object.keys(sketches).map((key, i) => {
            map[key] = i;
            return {
                name: key,
                ...sketches[key],
                children: []
            }
        });

        //top down
        list.forEach(entry => {
            const parent = Object.keys(sketches).find(key => sketches[key].children && sketches[key].children.find(node => node === entry.name));
            entry.parentId = parent || 'root';
        });

        list.forEach(entry => {
            if (entry.parentId !== 'root') {
                list[map[entry.parentId]].children.push(entry);
            } else {
                roots.push(entry);
            }
        });

        return roots;
    }
}
