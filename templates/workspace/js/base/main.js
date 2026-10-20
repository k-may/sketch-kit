import {MainView} from "./MainView.js";
import "../../scss/main.scss";

var mainView = new MainView(document.querySelector('section'));
mainView.initialize();
document.body.appendChild(mainView.el);

const targetFrameRate = 60;
var lastFrameTime = 0;

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        document.body.classList.add('fullscreen');
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
        document.body.classList.remove('fullscreen');
    }
}

document.addEventListener(
    "keydown",
    (e) => {
        if (e.key === "f") {
            toggleFullScreen();
        }
    },
    false
);

document.querySelector('.fullscreen').addEventListener(
    "click",
    (e) => {
        toggleFullScreen();
    }
);
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
