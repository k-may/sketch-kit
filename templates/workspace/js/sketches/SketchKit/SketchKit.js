import "./SketchKit.scss";
import { BaseSketch } from "../../base/BaseSketch.js";
import { ColorUtils } from "../../utils/ColorUtils.js";
import { CanvasUtils } from "../../utils/CanvasUtils.js";
import { RenderUtils } from "../../utils/RenderUtils";

export default class SketchKit extends BaseSketch {
  constructor() {
    super("SketchKit");
  }

  async init() {
    this.text = "SketchKit " + __version__ + " ";
    this.textWidth = 0;

    this.buffer = CanvasUtils.CreateBuffer();
    this.el.appendChild(this.buffer.canvas);

    this.startColor = ColorUtils.RamdomColor();
    this.destColor = ColorUtils.RamdomColor();
    this.color = this.startColor.clone();

    await document.fonts.load('16px "Major Mono Display"', this.text);
  }

  draw({ time, deltaTime }) {
    super.draw({ time, deltaTime });

    this.buffer.fill(this.color.toRGBString());

    var color = ColorUtils.LerpColor(
      this.startColor,
      this.destColor,
      Math.sin(time * 0.002),
    );
    var fillColor = ColorUtils.InvertColor(color);

    var ctx = this.buffer.ctx;
    ctx.fillStyle = fillColor.toRGBString();
    ctx.font = this.fontSize + "px Major Mono Display";
    var y = this.fontSize;
    var width = this.textWidth;
    while (y < this.buffer.height) {
      for (var i = 0; i < 4; i++) {
        var x = Math.sin(y + time * 0.001) * width + (i - 1) * width;
        this.drawTitle(ctx, x, y);
      }
      y += this.fontSize;
    }
  }

  getHeight() {
    return super.getHeight() * 2;
  }

  drawTitle(ctx, x, y) {
    ctx.fillText(this.text, x, y);
  }

  onResize(args) {
    super.onResize(args);
    this.buffer.resizeToDisplaySize();

    const ctx = this.buffer.ctx;
    const targetWidth = this.buffer.width * 0.8;
    const referenceSize = 100;

    ctx.font = `${referenceSize}px "Major Mono Display"`;
    const measuredWidth = ctx.measureText(this.text).width;

    this.fontSize = Math.floor((referenceSize * targetWidth) / measuredWidth);
    ctx.font = `${this.fontSize}px "Major Mono Display"`;
    this.textWidth = ctx.measureText(this.text).width;
  }

  onScroll(scrollY, percentage) {
    super.onScroll(percentage);

    this.color = ColorUtils.LerpColor(
      this.startColor,
      this.destColor,
      percentage,
    );
  }
}
