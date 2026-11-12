/**
 * Algorithm Hub — Visualizer Base Engine
 * Shared step-by-step recording and playback engine for all algorithm visualizers.
 *
 * Usage:
 *   1. Create an instance: const viz = new VisualizerEngine(config)
 *   2. Record steps during algorithm execution: viz.recordStep(state)
 *   3. Bind to controls: viz.bindControls()
 *   4. Let the engine handle playback with Play/Pause/Step/Speed
 */

class VisualizerEngine {
  /**
   * @param {object} config
   * @param {function} config.render     - (step) => void — renders a step to the canvas
   * @param {function} config.highlightCode - (lineIndex) => void — highlights a code line
   * @param {function} config.onStepChange - (stepIndex, totalSteps) => void — step counter update
   * @param {number}   [config.defaultSpeed=500] - ms between steps
   */
  constructor(config) {
    this.render = config.render;
    this.highlightCode = config.highlightCode || (() => {});
    this.onStepChange = config.onStepChange || (() => {});
    this.defaultSpeed = config.defaultSpeed || 500;

    this.steps = [];
    this.currentStep = -1;
    this.isPlaying = false;
    this.speed = this.defaultSpeed;
    this._timer = null;

    // DOM references (set by bindControls)
    this._btnPlay = null;
    this._btnPause = null;
    this._btnStepForward = null;
    this._btnStepBack = null;
    this._btnReset = null;
    this._speedSlider = null;
    this._stepCounter = null;
  }

  /** Clear all recorded steps and reset to initial state. */
  reset() {
    this.pause();
    this.steps = [];
    this.currentStep = -1;
    this._updateCounter();
    this._updateButtons();
  }

  /**
   * Record a snapshot of the algorithm's state at this point.
   * @param {object} step
   * @param {Array}  step.array        - Current state of the data (deep copy recommended)
   * @param {Array}  [step.highlights] - Indices to highlight (e.g., [i, j] being compared)
   * @param {string} [step.action]     - e.g., "comparing", "swapping", "sorted"
   * @param {string} [step.description]- Human-readable step description
   * @param {number} [step.codeLine]   - Index of the code line to highlight
   * @param {object} [step.extra]      - Any extra data for custom rendering
   */
  recordStep(step) {
    this.steps.push(JSON.parse(JSON.stringify(step)));
  }

  /** Go to a specific step index and render it. */
  goToStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStep = index;
    const step = this.steps[index];
    this.render(step);
    if (step.codeLine !== undefined) {
      this.highlightCode(step.codeLine);
    }
    this._updateCounter();
    this._updateButtons();
  }

  /** Step forward by one. */
  stepForward() {
    if (this.currentStep < this.steps.length - 1) {
      this.goToStep(this.currentStep + 1);
    } else {
      this.pause();
    }
  }

  /** Step backward by one. */
  stepBack() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  /** Start automatic playback. */
  play() {
    if (this.steps.length === 0) return;
    if (this.currentStep >= this.steps.length - 1) {
      // If at end, restart
      this.currentStep = -1;
    }
    this.isPlaying = true;
    this._updateButtons();
    this._playLoop();
  }

  /** Pause automatic playback. */
  pause() {
    this.isPlaying = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._updateButtons();
  }

  /** Internal play loop */
  _playLoop() {
    if (!this.isPlaying) return;
    if (this.currentStep >= this.steps.length - 1) {
      this.pause();
      return;
    }
    this.stepForward();
    this._timer = setTimeout(() => this._playLoop(), this.speed);
  }

  /** Set playback speed in milliseconds per step. */
  setSpeed(ms) {
    this.speed = Math.max(50, Math.min(2000, ms));
  }

  /**
   * Bind the engine to DOM controls.
   * Looks for elements by these selectors (configurable):
   * - .vis-btn-play, .vis-btn-pause, .vis-btn-step-forward, .vis-btn-step-back, .vis-btn-reset
   * - .vis-speed-slider
   * - .vis-step-counter
   */
  bindControls(container = document) {
    this._btnPlay = container.querySelector('.vis-btn-play');
    this._btnPause = container.querySelector('.vis-btn-pause');
    this._btnStepForward = container.querySelector('.vis-btn-step-forward');
    this._btnStepBack = container.querySelector('.vis-btn-step-back');
    this._btnReset = container.querySelector('.vis-btn-reset');
    this._speedSlider = container.querySelector('.vis-speed-slider');
    this._stepCounter = container.querySelector('.vis-step-counter');

    if (this._btnPlay) {
      this._btnPlay.addEventListener('click', () => this.play());
    }
    if (this._btnPause) {
      this._btnPause.addEventListener('click', () => this.pause());
    }
    if (this._btnStepForward) {
      this._btnStepForward.addEventListener('click', () => {
        this.pause();
        this.stepForward();
      });
    }
    if (this._btnStepBack) {
      this._btnStepBack.addEventListener('click', () => {
        this.pause();
        this.stepBack();
      });
    }
    if (this._btnReset) {
      this._btnReset.addEventListener('click', () => {
        this.pause();
        if (this.steps.length > 0) {
          this.goToStep(0);
        }
      });
    }
    if (this._speedSlider) {
      this._speedSlider.addEventListener('input', (e) => {
        // Slider: 1 (slow) to 10 (fast) → map to 1000ms down to 50ms
        const val = parseInt(e.target.value);
        this.setSpeed(1050 - val * 100);
      });
    }

    this._updateButtons();
  }

  /** Update button disabled states */
  _updateButtons() {
    const atStart = this.currentStep <= 0;
    const atEnd = this.currentStep >= this.steps.length - 1;
    const empty = this.steps.length === 0;

    if (this._btnPlay) {
      this._btnPlay.disabled = empty || (atEnd && this.isPlaying);
      this._btnPlay.style.display = this.isPlaying ? 'none' : '';
    }
    if (this._btnPause) {
      this._btnPause.style.display = this.isPlaying ? '' : 'none';
    }
    if (this._btnStepForward) this._btnStepForward.disabled = empty || atEnd;
    if (this._btnStepBack) this._btnStepBack.disabled = empty || atStart;
    if (this._btnReset) this._btnReset.disabled = empty;
  }

  /** Update the step counter display */
  _updateCounter() {
    if (this._stepCounter) {
      const current = this.currentStep + 1;
      const total = this.steps.length;
      this._stepCounter.textContent = total > 0
        ? `Step ${current} / ${total}`
        : 'No steps';
    }
    this.onStepChange(this.currentStep, this.steps.length);
  }
}

// Export for module usage or attach to window for inline scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VisualizerEngine };
} else {
  window.VisualizerEngine = VisualizerEngine;
}

