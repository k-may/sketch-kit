import {BaseSketch} from '../../base/BaseSketch.js';
import {ColorUtils} from '../../utils/ColorUtils.js';
import {CanvasUtils} from '../../utils/CanvasUtils.js';

export default class SketchKit extends BaseSketch {

    constructor() {
        super('DefaultSketch');

        this.buffer = CanvasUtils.CreateBuffer();
        this.el.appendChild(this.buffer.canvas);

        this.startColor = ColorUtils.RamdomColor();
        this.destColor = ColorUtils.RamdomColor();
        this.color = this.startColor.clone();
    }

    draw({time, deltaTime}) {
        super.draw({time, deltaTime});

        this.buffer.fill(this.color.toRGBString());

        var color = ColorUtils.LerpColor(this.startColor, this.destColor, Math.sin(time * 0.002));
        var fillColor = ColorUtils.InvertColor(color);

        var ctx = this.buffer.ctx;
        ctx.fillStyle = fillColor.toRGBString()

        var y = this.fontSize;
        var width = this.buffer.width * 0.8;

        while (y < this.buffer.height) {

            for (var i = 0; i < 4; i++) {
                var x = Math.sin(y + time * 0.001) * width + (i - 1) * width;
                this.drawTitle(ctx, x, y);
            }
            y += this.fontSize;
        }

    }

    drawTitle(ctx, x, y) {
        ctx.font = this.fontSize + 'px Major Mono Display';
        ctx.fillText('Sketch-Kit', x, y);
    }

    onResize(width, height) {
        super.onResize(width, height);
        this.buffer.resizeToDisplaySize();

        var width = this.buffer.width * 0.8;
        var fontSize = 0;
        var ctx = this.buffer.ctx;

        do {
            ctx.font = (fontSize++) + 'px Major Mono Display';
            var size = ctx.measureText('Sketch-Kit');
        } while (size.width < width);

        this.fontSize = fontSize;
    }

    onScroll(percentage) {
        super.onScroll(percentage);

        this.color = ColorUtils.LerpColor(this.startColor, this.destColor, percentage)
    }
}