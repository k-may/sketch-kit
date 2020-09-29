import {BEIGE} from '../globals.js';

export default class BoundingBox {

    constructor() {
        this.reset();
    }

    reset() {
        this.x = Number.MAX_SAFE_INTEGER;
        this.y = Number.MAX_SAFE_INTEGER;
        this.w = 0;
        this.h = 0;
        this.r = 0;
        this.b = 0;
        this.dirty = false;
    }

    add(rect) {
        if(rect) {
            this.x = Math.floor(rect.x < this.x ? rect.x : this.x);
            this.y = Math.floor(rect.y < this.y ? rect.y : this.y);
            this.r = Math.ceil(rect.x + rect.w > this.r ? rect.x + rect.w : this.r);
            this.b = Math.ceil(rect.y + rect.h > this.b ? rect.y + rect.h : this.b);
            this.w = this.r - Math.max(0, this.x);
            this.h = this.b - Math.max(0, this.y);
            this.dirty = true;
        }
    }

    fillRect(ctx, fillStyle) {

        if(fillStyle)
            ctx.fillStyle = BEIGE;

        if (this.w && this.h) {
            ctx.fillRect(
                Math.max(0, this.x),
                Math.max(0, this.y),
                Math.min(ctx.canvas.width, this.w),
                Math.min(ctx.canvas.height, this.h));
        }
        this.reset();
    }

}