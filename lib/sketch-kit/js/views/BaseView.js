export class BaseView {

    constructor(el, className) {

        this.el = el || document.createElement("div");

        if (className)
            this.el.className = className;
    }
}