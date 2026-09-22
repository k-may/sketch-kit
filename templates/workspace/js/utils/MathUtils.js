export let MathUtils = {
    map_range: (value, startValue, range) => {
        return Math.min(1, Math.max(0, (value - startValue) / range));
    },

    interpolateRect(start, dest, ease) {
        ease = ease !== undefined ? ease : 0.05;
        return {
            x: start.x + (dest.x - start.x) * ease,
            y: start.y + (dest.y - start.y) * ease,
            w: start.w + (dest.w - start.w) * ease,
            h: start.h + (dest.h - start.h) * ease,
        }
    }
}