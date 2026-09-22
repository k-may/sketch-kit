import {BaseView} from '../BaseView.js';
import {buildSketchTree} from '../../utils/SketchRegistry.js';

const TagColors = [
    'green',
    'pink',
    'blue',
    'yellow',
    'grey',
    'maroon',
    'ochre',
    'beige'
];

export class MenuView extends BaseView {

    constructor(el, sketches) {
        super(el);
        this.sketch = null;
        this.sketches = sketches;

        this.tags = {};

        this._start();

    }

    //-----------------------------------------


    _start() {

        var button = document.createElement('button');
        this.el.appendChild(button);

        const roots = this._constructTree(this.sketches);

        const listEl = document.createElement('ul');
        this._buildBranch(roots, listEl);

        const cont = document.createElement("div");
        cont.appendChild(listEl);

        this.el.appendChild(cont);

        this.el.onclick = function (e) {
            const entry = e.target.closest('[data-id]');
            if (entry) location.hash = '#' + entry.dataset.id;
        };

    }

    _buildBranch = (list, listEl) => {

        list.forEach(child => {

            const entryEl = document.createElement('li');
            entryEl.dataset['id'] = child.name;

            const button = document.createElement("div");
            button.textContent = child.label ?? child.name;
            button.className = "sketch";
            button.dataset['id'] = child.name;
            entryEl.appendChild(button)

            if(child.tags && child.tags.length){

                const div = document.createElement("div");
                div.className = "tags_container";
                button.appendChild(div);

                child.tags.forEach(tag => {

                    const span = document.createElement("span");
                    div.appendChild(span);

                    if(!this.tags[tag])
                        this.tags[tag] = TagColors[Object.keys(this.tags).length];

                    span.className = `tag ${this.tags[tag]}`;

                    const tagButton = document.createElement("span")
                    tagButton.innerHTML = tag;
                    span.appendChild(tagButton);


                })

            }

            if (child.children && child.children.length) {
                const listEl = document.createElement('ul');
                this._buildBranch(child.children, listEl);
                entryEl.appendChild(listEl);
            }

            listEl.appendChild(entryEl);
        })

    }

    _constructTree(sketches) {
        return buildSketchTree(sketches);
    }
}
