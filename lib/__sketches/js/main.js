import {MainView} from "./views/MainView.js";

var mainView = new MainView({el: document.getElementsByClassName('js-region-main')[0]});
mainView.initialize();

function draw() {
    window.requestAnimationFrame(draw);
    var time = window.performance.now();
    mainView.draw(time);

}

draw();
