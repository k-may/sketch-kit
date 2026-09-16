# Sketch styles and Sass modules

`create` inserts new sketch modules into this block at the beginning of
`sketch-kit/scss/main.scss`, before other Sass rules:

```scss
// code-in: sketch-styles
@use "sketches/SketchKit" as sketch_SketchKit;
// code-out: sketch-styles

@use "mixins";
@use "reset";
@use "menu";
```

Keep both directive comments. Create and copy add a module immediately before
code-out; replace keeps its existing entry. Generated module namespaces use
`sketch_` to avoid collisions with built-in modules such as `menu`.

## Existing projects

Existing generated projects are not rewritten automatically. Move their sketch
imports into the block shown above at the very beginning of main.scss and change
them to @use. Remove the old imports at the bottom. Convert other Sass imports to
@use too. Each partial must explicitly load its own dependencies: for example,
`@use "mixins";` and `@include mixins.scroll-styles;`. In main.scss, menu colours
become `menu.$grey` and `menu.$pink`. A sketch needing shared mixins uses
`@use "../mixins";` in its own file. CSS URL imports can remain CSS @import rules.

If the directive is missing, duplicated, or not at the beginning, create stops
without installing the sketch and points here for migration instructions.

Loading sketch modules at the top also emits their CSS before the remaining
modules and main.scss rules. Check equal-specificity overrides when migrating.
