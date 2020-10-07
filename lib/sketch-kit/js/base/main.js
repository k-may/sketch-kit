import {MainView} from "./MainView.js";

var mainView = new MainView(document.querySelector('section'));
mainView.initialize();
document.body.appendChild(mainView.el);

const targetFrameRate = 60;
var lastFrameTime = 0;

function draw() {

    var time = window.performance.now();
    const time_since_last = time - lastFrameTime;
    const target_time_between_frames = 1000 / targetFrameRate;

    const epsilon = 5;
    if (
        time_since_last >= target_time_between_frames - epsilon
    ) {
        const deltaTime = time - lastFrameTime;
        mainView.draw({time,deltaTime});
        lastFrameTime = time;
    }

    window.requestAnimationFrame(draw);
}


draw();
