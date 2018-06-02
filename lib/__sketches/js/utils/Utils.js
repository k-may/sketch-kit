import {CanvasUtils} from "./CanvasUtils.js";
import {LoadingUtils} from "./LoadingUtils.js";
import {TransformUtils} from "./TransformUtils.js";

var utils = Object.assign({}, CanvasUtils);
utils = Object.assign(utils, LoadingUtils);
utils = Object.assign(utils, TransformUtils);

export let Utils = utils;