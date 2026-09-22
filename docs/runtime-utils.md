# Workspace utility behavior

These utilities are copied from `templates/workspace/js/utils/` when initializing
a workspace. Updating the CLI does not rewrite existing generated projects.

## Sketch registration

`SketchUtils.sanitizeElementName(id)` now encodes characters instead of deleting
them. Sketch IDs and CSS ID selectors are unchanged, but custom-element tag names
may change. Prefer the sketch ID when targeting an element with CSS.
`registerElement` permits repeated registration of the same constructor and
rejects a different class using the same tag. MainView reports loading failures
rather than silently instantiating another sketch.

## Rendering

`RenderUtils.loop(callback, { targetFrameRate: 60, isRunning: true })` retains
automatic startup. Pass `isRunning: false` to start explicitly. `start()` and
`stop()` are idempotent, including calls inside the rendering callback.
The first frame after creation or restart has `deltaTime: 0`; later deltas are
milliseconds between rendered frames. Paused time is not included on restart.

## Loading

AJAX, SVG, JSON, shader and image loaders reject with Error objects on failure.
Batch methods propagate failures. An optional second argument accepts
`{ timeout: 30000, signal }`; timeout is in milliseconds, with zero disabling it.
HTTP loaders accept all 2xx responses. JSON still requires a valid JSON body.
SVG loaders retain their XML-document return value.

## Matrices and transforms

MatrixUtils imports an explicit VectorUtils module extracted from the bundled
MIT-licensed Sylvester implementation. Copy both files together when updating an
existing workspace. The default matrix factory and vector-returning methods are
preserved. TransformUtils writes the standard `style.transform` property.
