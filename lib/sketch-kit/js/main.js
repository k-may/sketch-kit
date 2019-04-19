import {MainView} from "./views/MainView.js";

var mainView = new MainView(document.getElementsByClassName('js-region-main')[0]);
mainView.initialize();
document.body.appendChild(mainView.el);

function draw() {
    window.requestAnimationFrame(draw);
    var time = window.performance.now();
    mainView.draw(time);

}

draw();
