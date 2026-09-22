const TARGET_FRAME_RATE = 60;

export const RenderUtils = {
    // Starts immediately by default; pass { isRunning: false } for explicit start.
    loop(callback, { targetFrameRate = TARGET_FRAME_RATE, isRunning: autoStart = true } = {}) {
        if (!Number.isFinite(targetFrameRate) || targetFrameRate <= 0) {
            throw new RangeError('targetFrameRate must be a positive finite number');
        }
        const interval = 1000 / targetFrameRate;
        let running = false;
        let frameId = null;
        let lastTime = null;
        let generation = 0;

        const schedule = () => {
            if (!running || frameId !== null) return;
            const scheduledGeneration = generation;
            frameId = window.requestAnimationFrame(time => tick(time, scheduledGeneration));
        };
        const tick = (time, scheduledGeneration) => {
            if (!running || scheduledGeneration !== generation) return;
            frameId = null;
            const deltaTime = lastTime === null ? 0 : time - lastTime;
            if (lastTime === null || deltaTime >= interval - 0.01) {
                lastTime = time;
                callback({ time, deltaTime });
            }
            // start()/stop() may have been called from inside the callback.
            schedule();
        };
        const controls = {
            stop() {
                running = false;
                generation++;
                if (frameId !== null) window.cancelAnimationFrame(frameId);
                frameId = null;
                lastTime = null;
            },
            start() {
                if (running) return;
                running = true;
                lastTime = null;
                schedule();
            },
        };
        if (autoStart) controls.start();
        return controls;
    },
};
