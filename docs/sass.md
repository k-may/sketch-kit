# Sketch styles

Each new sketch owns its JavaScript and SCSS in the same directory:

```text
js/sketches/motion/
  motion.js
  motion.scss
```

The generated JavaScript imports `./motion.scss`. Vite compiles the SCSS,
updates styles during development, and includes them in production builds.
Sass remains a dependency; no separate Sass build step is required.

Keep sketch selectors inside `#motion`, the ID assigned to the sketch element.
Styles are global, load with the sketch module, and are not automatically removed
when switching sketches. Explicit scoping prevents one sketch from styling another.
Shared application styles still live in `scss/main.scss`; create, copy and replace
never edit that file and do not require code-in/code-out markers.

## Copying sketches

Copying renames the primary JS and SCSS to the new sketch ID and replaces the
source ID in those two files, including the JS stylesheet import and SCSS root
selector. Additional files and nested folders are copied unchanged. Prefer stable
relative names for helper styles and assets, and review any sketch-specific IDs
inside those extra files yourself. Additional SCSS must be imported from JS or
loaded with Sass `@use` to participate in the build.

## Migrating existing sketches

Existing styles continue working through their old main.scss imports. Newly
created sketches use colocated styles even in an older workspace. Copying or
replacing a sketch with a legacy `scss/sketches/_motion.scss` file requires
migration first:

1. Move `scss/sketches/_motion.scss` to `js/sketches/motion/motion.scss`.
2. Add `import "./motion.scss";` to `motion.js`.
3. Remove that sketch's `@use` or `@import` from `scss/main.scss` to avoid duplicate
   styles or a missing-file error. Remove the marker block once it is empty.
4. Adjust relative Sass dependencies and asset URLs for the new location. For
   example, `@use "../mixins";` becomes `@use "../../../scss/mixins";`.
5. Check equal-specificity overrides: sketch CSS now loads with its JS module
   rather than at the beginning of main.scss.

Each stylesheet must explicitly load its Sass dependencies with `@use`. To use
shared mixins from a colocated sketch stylesheet:

```scss
@use "../../../scss/mixins";

#motion {
  @include mixins.scroll-styles;
}
```

Generated workspaces are not automatically rewritten when the CLI is updated.
