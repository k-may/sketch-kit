import "../vendor/sylvester.src.js"

var TRANSFORM_PREFIX = 'transform';
var TRANSFORM_3D = true;//Modernizr["csstransforms3d"];

var domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
    pfx = '',
    elem = document.createElement('div');

for (var i = 0; i < domPrefixes.length; i++) {
    if (elem.style[domPrefixes[i] + 'AnimationName'] !== undefined) {
        pfx = domPrefixes[i];
        TRANSFORM_PREFIX = '-' + pfx.toLowerCase() + '-';
        break;
    }
}
TRANSFORM_PREFIX += 'transform';

export let TransformUtils = {

    Translate(el, pos) {

        if (!el) {
            return;
        }

        var cssTransformMatrix;

        if (TRANSFORM_3D) {
            pos.z = pos.z || 0;
            var translationM = this.GetTranslationMatrix(pos.x, pos.y, pos.z);
            cssTransformMatrix = this.MatrixToString3D(translationM);
        } else {
            //todo?
        }

        el.style[TRANSFORM_PREFIX] = cssTransformMatrix;
    },

    GetTranslationMatrix: function (translationX, translationY, translationZ) {
        var _translationX = translationX !== undefined ? translationX : 0;
        var _translationY = translationY !== undefined ? translationY : 0;
        var _translationZ = translationZ !== undefined ? translationZ : 0;
        return $M([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [_translationX, _translationY, _translationZ, 1]
        ]);
    },

    GetRotationMatrix(rX, rY, rZ) {
        var deg2rad = Math.PI / 180; // Degrees to radians constant

        var rotationXMatrix, rotationYMatrix, rotationZMatrix;
        rotationXMatrix = $M([
            [1, 0, 0, 0],
            [0, Math.cos(rX * deg2rad), Math.sin(-rX * deg2rad), 0],
            [0, Math.sin(rX * deg2rad), Math.cos(rX * deg2rad), 0],
            [0, 0, 0, 1]]);

        rotationYMatrix = $M([
            [Math.cos(rY * deg2rad), 0, Math.sin(rY * deg2rad), 0],
            [0, 1, 0, 0],
            [Math.sin(-rY * deg2rad), 0, Math.cos(rY * deg2rad), 0],
            [0, 0, 0, 1]]);

        rotationZMatrix = $M([
            [Math.cos(rZ * deg2rad), Math.sin(-rZ * deg2rad), 0, 0],
            [Math.sin(rZ * deg2rad), Math.cos(rZ * deg2rad), 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]]);

        return rotationXMatrix.x(rotationYMatrix).x(rotationZMatrix);
    },

    GetScaleMatrix: function (scaleX, scaleY, scaleZ) {
        var _scaleX = scaleX;
        var _scaleY = scaleY !== undefined ? scaleY : _scaleX;
        var _scaleZ = scaleZ !== undefined ? scaleZ : _scaleX;
        if (TRANSFORM_3D) {
            return $M([[_scaleX, 0, 0, 0], [0, _scaleY, 0, 0], [0, 0, _scaleZ, 0], [0, 0, 0, 1]]);
        } else {
            return $M([[_scaleX, 0, 0], [0, _scaleY, 0], [0, 0, 1]]);
        }
    },

    MatrixToString3D: function (transformationMatrix) {
        var stringTransform = 'matrix3d(';
        stringTransform += transformationMatrix.e(1, 1).toFixed(5) + ',' + transformationMatrix.e(1, 2).toFixed(5) + ',' + transformationMatrix.e(1, 3) + ',' + transformationMatrix.e(1, 4).toFixed(5) + ',';
        stringTransform += transformationMatrix.e(2, 1).toFixed(5) + ',' + transformationMatrix.e(2, 2).toFixed(5) + ',' + transformationMatrix.e(2, 3) + ',' + transformationMatrix.e(2, 4).toFixed(5) + ',';
        stringTransform += transformationMatrix.e(3, 1).toFixed(5) + ',' + transformationMatrix.e(3, 2).toFixed(5) + ',' + transformationMatrix.e(3, 3) + ',' + transformationMatrix.e(3, 4).toFixed(5) + ',';
        stringTransform += transformationMatrix.e(4, 1).toFixed(5) + ',' + transformationMatrix.e(4, 2).toFixed(5) + ',' + transformationMatrix.e(4, 3) + ',' + transformationMatrix.e(4, 4).toFixed(5);
        stringTransform += ')';
        return stringTransform;
    },

    SetTransformMatrix(el, listMatrix) {
        var cssTransformMatrix;

        if (!Array.isArray(listMatrix)) {
            listMatrix = [listMatrix];
        }

        if (TRANSFORM_3D) {
            var translationM = this.GetResultMatrix(listMatrix);
            cssTransformMatrix = this.GetStringTransform3d(translationM);
        } else {
            //todo make this work...
            //cssTransformMatrix = this.GetStringTranslate2d(pos.x, pos.y);
        }

        el.style[TRANSFORM_PREFIX] = cssTransformMatrix;
    }

};
