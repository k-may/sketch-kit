
![alt text](sketch-kit.png "Logo Title Text 1")

[![Node CI](https://github.com/k-may/sketch-kit/actions/workflows/nodejs.yml/badge.svg)](https://github.com/k-may/sketch-kit/actions/workflows/nodejs.yml)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fk-may%2Fsketch-kit.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fk-may%2Fsketch-kit?ref=badge_shield)

[![npm version](https://badge.fury.io/js/sketch-kit.svg)](https://badge.fury.io/js/sketch-kit)


<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#setup">Setup</a></li>
    <li><a href="#cli">CLI</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

Rapid prototyping framework for HTML5 projects

To help speed up the process of creating and running small experiments and prototypes I've developed some tools which I believe take much of the pain out of the experience.

**Exploratory code needs room to breathe.**

Polished project code asks for certainty. An experiment asks a better question: what happens if I try this? Sketch Kit lives alongside your project, giving a sketch its own JavaScript and SCSS files so you can test an idea without dragging the whole application into it.

**When code becomes cheap, explore more**

Agentic programming makes it possible to produce working code at extraordinary speed. But faster implementation can create pressure to decide too early—to describe exactly what you want, then ask an agent to make sweeping changes to the real codebase.

Creative work rarely begins with that certainty.

Sketch Kit offers another approach: ask an agent to build several small possibilities. Try different interactions, structures or visual behaviours without requiring any of them to becomethe solution. Run them. Compare them. Change the promising ones. Forget the rest.

When the cost of writing code falls, code no longer needs to be treated as a precious final product. It can become a material for thinking.

The developer’s role is not simply to specify the correct answer in advance. It is to create the conditions in which better answers can be discovered.

Don’t ask an agent for one big answer.
Give it room to make many small suggestions.

Sketch-Kit is ideal for :
- **Experimenting** with js libraries used in your project code
- **Nuancing transitions** (without having to navigate and potentially contaminate project code)
- **Sharing** code examples with your team
- Quick **iteration** on sketches
- Not being bound to a _safety-first_ developer mindset, encourage developers to have a little fun and **be expressive**!

### Built With

- [vite](https://vitejs.dev/) (HMR, development, building)
- [lit](https://lit.dev/) (web components)
- sass

![alt text](https://github.com/k-may/sketch-kit/raw/master/design/Screenshot%202022-06-01%20113728.png "Screen Grab")

## Roadmap

- [x] Migrate to [vite](https://vitejs.dev/) for HMR and build tools
- [ ] UI Improvements:
  - [x] Add fullscreen button
  - [ ] Add 'create sketch' button
- [ ] Console Improvements:
  - [ ] Tagging via 'create' statement
- [ ] Add support for [dat.gui](https://github.com/dataarts/dat.gui) to allow for easy control of sketch parameters

- [ ] Add support for [three.js](https://threejs.org/) to allow for easy 3D prototyping

- [ ] Add support for [p5.js](https://p5js.org/) to allow for easy 2D prototyping


## Setup

Each sketch gets a JavaScript file and SCSS file together in `js/sketches/<name>/`.
The JavaScript imports `./<name>.scss`, so Vite handles style loading and updates.
See [sketch styles and migration](docs/sass.md) for existing workspaces.

When the sketch is selected from the menu (top left, very discrete) the js for the sketch is imported and attached to a dom element on the page. This element is exposed as `this.el`.

Each sketch exposes a interface for commonly used methods, the most important being '_draw_' : 

```js
    /**
     * All rendering should be placed here. Tick durations are clamped to 60fps
     * @param time : number
     * @param deltaTime : number
     */
    draw({time, deltaTime}) {
        //rendering goes here!
    }

```

## Repository layout

- `app/`: CLI implementation and internal helpers.
- `templates/workspace/`: workspace copied into a user's `sketch-kit/` folder by `init`.
- `templates/sketch/`: JavaScript and SCSS templates used by `create`.

An optional [Three.js scene template](docs/threejs-template.md) includes an orbiting
camera, cube, grid, and hover outline.

## CLI

### Init

`sketch-kit init`

This command will add a 'sketch-kit' folder to the root of your directory. Inside you'll find :

```
sketch-kit/
|-- assets/
|-- css/
|-- js/
|-- scss/
|-- index.html
`-- sketch-kit.config.json
```

**Options**

- Project Name. _Name for the project (basically becomes the title for the rendered page)._
Sketch Kit copies its workspace template; it does not copy dependencies from your project.

### Run

`sketch-kit run`

sketch-kit starts a Vite development server with HMR on port 3002. Vite handles SCSS updates.


### Create

`sketch-kit create [sketch name] [copy name(optional)]`

sketch-kit will add a new sketch to your sketches and wil now be available in the menu. This sketch includes the base sketch view template and a colocated SCSS file scoped to the sketch element ID. Copying renames both primary files and updates their sketch references; extra files are copied unchanged.

Interactive creation, copying, and replacement show a summary and ask for confirmation before writing files.
The summary includes the sketch name, author, template or copy source, directory, and registry.
Replacement also warns that existing sketch files will be replaced. Use `--yes` to skip confirmation; noninteractive creation stays prompt-free.

New sketches prompt for an optional template: **None** (the default empty starter) or **Three.js**.
Three.js sketches require `npm install three` in the host project. Noninteractive creation uses None.

If the sketch already exists, you'll be prompted to copy or replace, creating a new nested iteration. Copying keeps the source code; replacing offers the template choice again.

**Note;** give sketches unique names to ensure that there aren't conflicts when copying. The replace method will search through the code and indescriminately replace the sketch name with whatever the next sketch name will be


### Delete

`sketch-kit delete <name> [--yes]`

Removes a sketch from the registry and deletes its entire directory, including extra files.
Prompts for confirmation; use --yes for noninteractive commands. Delete child sketches first.
Legacy styles must be migrated as described in [sketch styles and migration](docs/sass.md) before deletion.

### Build

`sketch-kit build`

sketch-kit will create a `build/` folder containing a static build of the project.


### Global Options

`--configFile alt.config.json` selects another config file inside `sketch-kit/` after initialization. If that file is missing, Sketch Kit falls back to the default config.

## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fk-may%2Fsketch-kit.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fk-may%2Fsketch-kit?ref=badge_large)


## Contact

[Kev Mayo](https://kevinmayo.com)  / [email](mailto:hello@kevinmayo.com)

## Automated releases

PRs targeting main run **PR Checks**. Merging a fix/* or feature/* PR runs
**Prepare Release PR**, which creates or refreshes a single release/next PR:

- fix/* requests a patch bump (1.0.0 becomes 1.0.1).
- feature/* requests a minor bump (1.0.0 becomes 1.1.0).
- A pending minor bump stays minor when more fixes arrive. Additional features
  also stay at 1.1.0 until the release merges.

The automation rebuilds release/next from current main, updates package.json and
package-lock.json, and records the pending bump in its commit. Do not manually edit
this managed branch. Updates can dismiss existing approvals under repository rules.
The branch is pushed with a lease so concurrent edits are not silently overwritten.
Preparation and publishing queue together to avoid competing release jobs.

When you merge the release/next PR, **Publish Release** checks out that exact merged
commit, validates the version, runs tests, creates its v<version> tag, and publishes
to npm. It never pushes a commit to main. Reruns reuse the tag and skip an already
published npm version. Other branch names and unmerged PR closures do not release.

Setup:

- Add the repository secret NPM_TOKEN with permission to publish sketch-kit.
- In Settings > Actions > General > Workflow permissions, enable **Allow GitHub
  Actions to create and approve pull requests**. The workflow requests contents:write
  and pull-requests:write; it does not approve or merge the release PR.
- Allow automation to update release/next and create version tags. Main can keep
  its requirement that changes arrive through PRs.
- GitHub may require approval before PR Checks run on a bot-created release PR.
  For automatic checks, optionally set RELEASE_PR_TOKEN to a GitHub App installation
  token (or a fine-grained token) with contents and pull request write permissions.
  Preparation uses that token for both the branch push and PR updates. Without it,
  the built-in GITHUB_TOKEN is used. Required checks must pass before merging.

The first preparation/publish workflows become available after these workflow
files reach main. No npm package is published merely by opening a release PR.
