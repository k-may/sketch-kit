export class BaseView {

    /**
     *
     * @param el : HTMLElement
     * @param className : string
     */
    constructor(el, className) {

        this.el = el || document.createElement("div");

        if (className)
            this.el.className = className;
    }
}