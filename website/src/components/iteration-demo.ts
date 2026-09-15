import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import squareIcon from '../assets/iteration-square.svg?url';
import circleIcon from '../assets/iteration-circle.svg?url';
import branchIcon from '../assets/iteration-circle-square.svg?url';

const revisionIcons = [squareIcon, circleIcon, branchIcon];

const revisions = [
  { id: '01', title: 'first mark', note: 'one circle; a place to begin', size: 70, drift: 0, angle: 0 },
  { id: '02', title: 'copy + offset', note: 'keep the first mark, move its twin', size: 70, drift: 46, angle: 0 },
  { id: '03', title: 'change the rhythm', note: 'change one variable; compare the result', size: 82, drift: 66, angle: -18 },
];

@customElement('iteration-demo')
export class IterationDemo extends LitElement {
  @state() private revision = 0;

  static styles = css`
    :host {
      display: block;
      color: var(--ink);
      font-family: var(--font-text);
    }

    * {
      box-sizing: border-box;
    }

    .demo {
      border: 1px solid var(--outline);
      background: var(--surface);
    }

    .bar {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: .85rem 1rem;
      border-bottom: 1px solid var(--outline);
      font: 600 .72rem/1.4 var(--font-code);
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .bar span:last-child {
      color: var(--muted);
    }

    .body {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(230px, 1fr);
      min-height: 350px;
    }

    .canvas {
      position: relative;
      overflow: hidden;
      display: grid;
      place-items: center;
      min-height: 350px;
      background-color: var(--paper);
      background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px);
      background-size: 24px 24px;
      border-right: 1px solid var(--outline);
    }

    .canvas::after {
      content: 'output / live';
      position: absolute;
      left: 1rem;
      bottom: 1rem;
      color: var(--muted);
      font: .7rem var(--font-code);
    }

    .mark {
      width: 180px;
      height: 180px;
      position: relative;
      transform: rotate(var(--angle));
      transition: transform .35s ease;
    }

    .ring {
      position: absolute;
      width: var(--size);
      height: var(--size);
      border: 3px solid var(--signal);
      border-radius: 50%;
      left: 49px;
      top: 52px;
      transition: all .35s ease;
    }

    .ring.two {
      left: calc(49px + var(--drift));
      top: calc(52px - var(--drift) / 3);
      opacity: var(--second-opacity);
    }

    .iteration-icon {
      display: inline-block;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      background: currentColor;
      mask: var(--icon) center / contain no-repeat;
    }

    .dot {
      position: absolute;
      width: 18px;
      height: 18px;
      color: var(--ink);
      left: 87px;
      top: 90px;
    }

    .side {
      display: flex;
      flex-direction: column;
      padding: 1.1rem;
    }

    .label {
      color: var(--muted);
      font: .7rem var(--font-code);
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .title {
      margin: 1.2rem 0 .35rem;
      font: 1.5rem/1.2 var(--font-display);
    }

    .note {
      margin: 0;
      color: var(--muted);
      font: .85rem/1.5 var(--font-code);
    }

    .code {
      margin: 1.5rem 0 auto;
      padding: 1rem;
      border: 1px solid var(--outline);
      white-space: pre-wrap;
      font: .8rem/1.65 var(--font-code);
    }

    .code b {
      color: var(--signal);
      font-weight: 600;
    }

    .controls {
      display: flex;
      gap: .45rem;
      margin-top: 1.5rem;
    }

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .35rem;
      flex: 1;
      padding: .8rem .25rem;
      border: 1px solid var(--outline);
      border-radius: var(--shape-small);
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
      font: 600 .76rem var(--font-code);
      transition: background .18s, color .18s;
    }

    button:hover {
      background: var(--signal-soft);
    }

    button:focus-visible {
      outline: 3px solid var(--signal);
      outline-offset: 2px;
    }

    button[aria-pressed='true'] {
      background: var(--signal);
      border-color: var(--signal);
      color: var(--on-signal);
    }

    @media (max-width: 720px) {
      .body {
        grid-template-columns: 1fr;
      }

      .canvas {
        border-right: 0;
        border-bottom: 1px solid var(--outline);
        min-height: 270px;
      }

    }

    @media (prefers-reduced-motion: reduce) {
      .mark, .ring, button {
        transition: none;
      }

    }
  `;

  render() {
    const item = revisions[this.revision];
    const style = `--size:${item.size}px;--drift:${item.drift}px;--angle:${item.angle}deg;--second-opacity:${this.revision ? 1 : 0}`;
    return html`
      <div class="demo" aria-label="Interactive illustration of three sketch iterations">
        <div class="bar"><span>sketch / motion-study</span><span>revision ${item.id} of 03</span></div>
        <div class="body">
          <div class="canvas" role="img" aria-label="${item.note}">
            <div class="mark" style=${style}><div class="ring"></div><div class="ring two"></div><span class="dot iteration-icon" style=${`--icon: url("${squareIcon}")`} aria-hidden="true"></span></div>
          </div>
          <div class="side">
            <span class="label">// selected iteration</span>
            <p class="title">${item.title}</p>
            <p class="note">${item.note}</p>
            <div class="code">const sketch = {<br>  radius: <b>${item.size / 2}</b>,<br>  offset: <b>${item.drift}</b>,<br>  rotate: <b>${item.angle}</b><br>};</div>
            <div class="controls" role="group" aria-label="Select a revision">
              ${revisions.map((revision, index) => html`<button type="button" aria-pressed=${this.revision === index} @click=${() => this.revision = index}><span class="iteration-icon" style=${`--icon: url("${revisionIcons[index]}")`} aria-hidden="true"></span>${revision.id}</button>`)}
            </div>
          </div>
        </div>
      </div>`;
  }
}
