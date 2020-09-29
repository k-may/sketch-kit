export class Color {
    /***
     * Accepts either a hex value or rgba values
     * @param r
     * @param g
     * @param b
     * @param a
     */
    constructor(r, g, b, a) {
        this.r = 0;
        if (typeof r == 'string') {
            var color = ColorUtils.HexToRgb(r);
            this.r = color.r;
            this.g = color.g;
            this.b = color.b;
            this.a = color.a;
        } else {
            this.r = r !== undefined ? r : 255;
            this.g = g  !== undefined ? g: 255;
            this.b = b  !== undefined ? b: 255;
            this.a = a  !== undefined ? a: 255;
        }
    }

    toRGBString() {
        return 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
    }

    toRGBAString() {
        return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
    }

    normailizedRGBA() {
        return [this.r / 255, this.g / 255, this.b / 255, this.a / 255];
    }

    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }
}

export let ColorUtils = {
    LerpColor: function(start, dest, ratio) {
        return new Color(
            parseInt(start.r + (dest.r - start.r) * ratio),
            parseInt(start.g + (dest.g - start.g) * ratio),
            parseInt(start.b + (dest.b - start.b) * ratio),
            parseInt(start.a + (dest.a - start.a) * ratio),
        );
    },
    RamdomColor: function() {
        return new Color(Math.random() * 255, Math.random() * 255, Math.random() * 255, 255);
    },
    HexToRgb: function(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return new Color(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16));
    },
};
