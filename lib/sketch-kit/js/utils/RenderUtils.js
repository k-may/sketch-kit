
const TARGETFRAMERATE = 60;
var lastFrameTime = 0;

export let RenderUtils = {

    /**
     * Creates a loop that calls the callback function with the time and deltaTime
     * @param callback
     * @returns {{stop: stop, start: start}}
     */
    loop: (callback, { targetFrameRate } = {}) => {
        let lastTime = 0;
        let isRunning = true;
        const loop = () => {
            var time = window.performance.now();
            const time_since_last = time - lastTime;
            const target_time_between_frames = 1000 / (targetFrameRate || TARGETFRAMERATE)
            const epsilon = 5;
            if (
                time_since_last >= target_time_between_frames - epsilon
            ) {
                const deltaTime = time - lastTime;
                isRunning && callback({time,deltaTime});
                lastTime = time;
            }

            isRunning && window.requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);

        return {
            /**
             * Stops the loop
             */
            stop: () => {
                lastTime = 0;
                isRunning = false;
            },
            /**
             * Starts the loop
             */
            start: () => {
                if (!isRunning) {
                    isRunning = true;
                    requestAnimationFrame(loop);
                }
            }
        }
    }

}
