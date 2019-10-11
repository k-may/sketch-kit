# test
Rapid prototyping framework for HTML5 projects

To help speed up the process of creating and running small experiments and prototypes I've developed some tools which I believe take much of the pain out of the experience.

The idea being that the more time I can spend on the fun bits (vs the boring dev-ops bits) the better.

Features:
- entirely es6
- no bundling (for better debugging and edit-and-continue)

## Usage

I sent up test as a global tool via node. You can do this by the following :

`npm link`

See the documentation here for explanation : https://blog.npmjs.org/post/118810260230/building-a-simple-command-line-tool-with-npm

Once we've global access, we can use the tool in any project folder. Personally, I like to include a 'sketches' folder in every project as I like to keep track of the prototypes which exist in parallel with a project.

### Update

`test update`

This is called by default by the following commands. Copies dependencies from package.json into the sketches folder.

Note; as of writing, most npm dependencies don't support es6 modules, to import deps into your sketch you'll most likely need to do something like the following to statically import them :

```
import '../../../node_modules/[library path]
```

### Init

`test init`

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

### Run

`test run`

This will start up browser-sync and the watch tasks for your scss.

Note; I've purposely left minification and bundling out of the framework so that its possible to edit your sources using developer tools. We've bundling for the vendor files only

### Create

`test create [sketch name] [copy name(optional)]`

This will add a new sketch to your sketches and wil now be available in the menu. This sketch includes the base sketch view template and a scss file with the sketch name being used as the css class reference.

If the sketch already exists, you'll be prompted to copy or replace, creating a new nested iteration.