# sketch-kit

[![npm version](https://badge.fury.io/js/sketch-kit.svg)](https://badge.fury.io/js/sketch-kit)

Rapid prototyping framework for HTML5 projects

To help speed up the process of creating and running small experiments and prototypes I've developed some tools which I believe take much of the pain out of the experience.

The idea being that the more time I can spend on the fun bits (vs the boring dev-ops bits) the better and more expressive prototyping can be.

**Features**:
- entirely es6
- no bundling (for better debugging and edit-and-continue)

## Setup

Each 'sketch' gets a javascript file and scss file generated on creation.

When the sketch is selected from the menu (top left, very discrete) the js for the sketch is imported and attached to a dom element on the page. This element is exposed as this.el.

## Commands
### Update

`sketch-kit update`

This is called by default by the following commands. Copies dependencies from package.json into the sketches folder.

Note; as of writing, most npm dependencies don't support es6 modules, to import deps into your sketch you'll most likely need to do something like the following to statically import them :

```
import '../../../node_modules/[library path]
```

### Init

`sketch-kit init`

This command will add a 'sketches' folder to the root of your directory. Inside you'll find :

```
sketches/
--------/assets
--------/css
--------/data
--------/js
--------/--------/main.js
--------/--------/sketches.js
--------/--------/utils
--------/--------/views
--------/--------/--------/components
--------/--------/--------/sketches
--------/node_modules
--------/scss
--------/--------/sketches
--------/index.html
```

**Options**

- Project Name. _Name for the project (basically becomes the title for the rendered page)._
- Copy Node Dependencies. _sketch-kit will automatically copy all dependencies from your project.json, making them available to your sketches (note: js modules only)._

### Run

`sketch-kit run`

sketch-kit will start up browser-sync and the watch tasks for your scss.

Note; I've purposely left minification and bundling out of the framework so that its possible to use js modules only. We've bundling for the vendor files only

### Create

`sketch-kit create [sketch name] [copy name(optional)]`

sketch-kit will add a new sketch to your sketches and wil now be available in the menu. This sketch includes the base sketch view template and a scss file with the sketch name being used as the css class reference.

If the sketch already exists, you'll be prompted to copy or replace, creating a new nested iteration.