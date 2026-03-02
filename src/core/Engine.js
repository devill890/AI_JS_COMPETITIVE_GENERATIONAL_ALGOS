// ======================================
// Engine.js
// Core Simulation Engine
// ======================================

export class Engine {

  constructor(container) {

    // Dependency Injection container
    this.container = container;

    // Core systems (resolved lazily)
    this.physics = container.get("PhysicsWorld");
    this.renderer = container.get("Renderer");
    this.agents = container.get("Agents");
    this.time = container.get("Time");
    this.overlay = container.has("TrainingOverlay")
      ? container.get("TrainingOverlay")
      : null;
    this.camera = container.has("CameraController")
      ? container.get("CameraController")
      : null;
    this.particleSystem = container.has("ParticleSystem")
      ? container.get("ParticleSystem")
      : null;

    // -----------------------------
    // Timing
    // -----------------------------
    this.fixedTimeStep = 1 / 60; // physics rate
    this.maxSubSteps = 5;

    this.timeScale = 1;
    this.accumulator = 0;

    this.running = false;
    this.paused = false;

    this.overlay?.bindPauseToggle((paused) => this.setPaused(paused));
    this.overlay?.setPauseState(this.paused);

    this._lastTime = 0;

    // Systems pipeline (expandable)
    this.systems = [];

    if (this.particleSystem) {
      this.addSystem(this.particleSystem);
    }
  }

  // ==================================
  // SYSTEM REGISTRATION
  // ==================================

  addSystem(system) {
    this.systems.push(system);
  }

  // ==================================
  // ENGINE CONTROL
  // ==================================

  start() {
    if (this.running) return;

    this.running = true;
    this._lastTime = performance.now();

    requestAnimationFrame(this._loop.bind(this));
  }

  stop() {
    this.running = false;
  }

  pause() {
    this.setPaused(true);
  }

  resume() {
    this.setPaused(false);
  }

  setPaused(paused) {
    this.paused = paused;
    this.overlay?.setPauseState(paused);
  }

  setTimeScale(scale) {
    this.timeScale = scale;
  }

  // ==================================
  // MAIN LOOP
  // ==================================

  _loop(now) {

    if (!this.running) return;

    const frameTime =
      Math.min((now - this._lastTime) / 1000, 0.25);

    this._lastTime = now;

    this.time?.update(frameTime);

    if (!this.paused) {
      this._update(frameTime * this.timeScale);
    }

    this.camera?.update(frameTime);

    requestAnimationFrame(this._loop.bind(this));
  }

  // ==================================
  // UPDATE PIPELINE
  // ==================================

  _update(deltaTime) {

    // Accumulate time for fixed physics
    this.accumulator += deltaTime;

    let subSteps = 0;

    // ----------------------------------
    // Fixed timestep simulation
    // ----------------------------------
    while (
      this.accumulator >= this.fixedTimeStep &&
      subSteps < this.maxSubSteps
    ) {

      this._fixedUpdate(this.fixedTimeStep);

      this.accumulator -= this.fixedTimeStep;
      subSteps++;
    }

    // ----------------------------------
    // Render interpolation alpha
    // ----------------------------------
    const alpha = this.accumulator / this.fixedTimeStep;

    this._render(alpha);
  }

  // ==================================
  // FIXED UPDATE (Physics + Agents)
  // ==================================

  _fixedUpdate(dt) {

    // ---- Agent AI ----
    for (const agent of this.agents) {
      agent.update(this.physics, dt);
    }

    // ---- Custom systems ----
    for (const system of this.systems) {
      if (system.fixedUpdate) {
        system.fixedUpdate(dt);
      }
    }

    // ---- Physics ----
    this.physics.step(dt);
  }

  // ==================================
  // RENDER
  // ==================================

  _render(alpha) {

    // Optional render systems
    for (const system of this.systems) {
      if (system.update) {
        system.update(alpha);
      }
    }

    this.renderer.render(this.physics, alpha);
  }
}
