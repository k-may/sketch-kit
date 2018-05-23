/* eslint-disable no-undef */
define(['lodash',
        'utils/TransformUtils',
        'utils/LoadingUtils',
        'utils/CanvasUtils'],
    function(_,
             TransformUtils,
             LoadingUtils,
             CanvasUtils) {

        var utils = {};
        _.extend(utils, TransformUtils);
        _.extend(utils, LoadingUtils);

        return utils;
    });