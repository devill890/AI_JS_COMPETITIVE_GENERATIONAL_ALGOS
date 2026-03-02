// ======================================
// Time.js
// Global Simulation Time Service
// ======================================

export class Time {
  constructor() {
    // Total runtime
    this.time = 0;

    // Frame delta (scaled)
    this.deltaTime = 0;

    // Fixed physics delta
    this.fixedDeltaTime = 1 / 60;

    // Real (unscaled) delta
    this.unscaledDeltaTime = 0;

    // Time multiplier
    this.timeScale = 1;

    // Frame counter
    this.frameCount = 0;

    // FPS tracking
    this.fps = 0;

    // internal
    this._fpsTimer = 0;
    this._fpsFrames = 0;
  }

  // ==================================
  // Called every render frame
  // ==================================
  update(realDelta) {
    this.unscaledDeltaTime = realDelta;
    this.deltaTime = realDelta * this.timeScale;

    this.time += this.deltaTime;
    this.frameCount++;

    this._updateFPS(realDelta);
  }

  // ==================================
  // Fixed-step update (physics tick)
  // ==================================
  fixedUpdate() {
    // available for future expansion
  }

  // ==================================
  // FPS Calculation
  // ==================================
  _updateFPS(dt) {
    this._fpsTimer += dt;
    this._fpsFrames++;

    if (this._fpsTimer >= 1) {
      this.fps = this._fpsFrames;
      this._fpsFrames = 0;
      this._fpsTimer = 0;
    }
  }

  // ==================================
  // Utility Helpers
  // ==================================

  setTimeScale(scale) {
    this.timeScale = Math.max(0, scale);
  }

  reset() {
    this.time = 0;
    this.frameCount = 0;
  }
}
