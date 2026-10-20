# Three.js sketch template

`templates/sketch/script_threejs.txt` provides the cube scene with a ground
plane, grid, colored axes, lights and shadows. The camera orbits automatically;
drag to orbit manually and scroll to zoom. The orange cube outline appears only
on pointer hover and is updated as the camera moves.

Use the existing `templates/sketch/sass.txt` unchanged. The scene measures and
observes the fixed canvas directly, so its parent does not need an explicit height.

## Use in an existing workspace

1. In the host project, run `npm install three`.
2. Run `sketch-kit create scene` in an interactive terminal.
3. At **Template (optional)**, choose **Three.js**.
4. Select the sketch in the menu.

The default **None** uses the standard empty `script.txt` starter. Both choices
use `sass.txt`. Copying preserves the source sketch without asking for a template;
replacing a sketch offers the template choice again. Noninteractive and debug/test
creation defaults to None. Dependencies are not installed automatically.

The scene uses BaseSketch's render loop and resize lifecycle. OrbitControls are
disconnected when the sketch is removed and reconnected on return. GPU resources
are retained because MainView caches sketch instances to preserve their state.
