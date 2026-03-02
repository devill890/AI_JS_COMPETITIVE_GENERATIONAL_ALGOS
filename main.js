// ======================================
// main.js
// Composition Root
// ======================================

import { DIContainer } from "./src/core/DIContainer.js";
import { Engine } from "./src/core/Engine.js";
import { Time } from "./src/core/time.js";

import { PhysicsWorld } from "./src/physics/PhysicsWorld.js";
import { RigidBody } from "./src/physics/RigidBody.js";
import { SphereCollider } from "./src/physics/SphereColider.js";

import { WebGLRenderer } from "./src/rendering/WebGLRenderer.js";

import { Vec3 } from "./src/math.js/Vec3.js";
import { ParticleSystem } from "./src/particles/ParticleSystem.js";
import { CameraController } from "./src/input/CameraController.js";
import { TrainingOverlay } from "./src/ui/TrainingOverlay.js";
import { TeamProgressOverlay } from "./src/ui/TeamProgressOverlay.js";

// ======================================
// Dependency Container
// ======================================

const di = new DIContainer();

// ======================================
// Canvas
// ======================================

di.register("canvas", () => {
  const canvas = document.createElement("canvas");

  document.body.style.margin = "0";
  document.body.appendChild(canvas);

  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.display = "block";

  return canvas;
});

// ======================================
// Physics World
// ======================================

di.register("PhysicsWorld", () => {
  const world = new PhysicsWorld();

  // ---------- Ground ----------
  const ground = new RigidBody({
    mass: 0,
    position: new Vec3(0, -5, 0),
  });

  const groundCollider = new SphereCollider(5);
  groundCollider.attach(ground);
  world.addBody(ground);

  return world;
});

di.register("Time", () => new Time());

di.register("TrainingOverlay", () =>
  new TrainingOverlay(document.getElementById("training-overlay")),
);

di.register("TeamProgressOverlay", () => {
  const container = document.getElementById("team-progress-overlay");
  return container ? new TeamProgressOverlay(container) : null;
});

di.register("CameraController", (c) =>
  new CameraController(c, {
    target: new Vec3(0, 1, 0),
    distance: 16,
  }),
);

// ======================================
// Robot Agents (unused placeholder)
// ======================================
di.register("Agents", () => []);

di.register("ParticleSystem", (c) =>
  new ParticleSystem(c, {
    populationSize: 10,
    mutationRate: 0.2,
    evaluationInterval: 10,
    captureRadius: 3.8,
    zoneHeight: 0.15,
  }),
);

// ======================================
// Renderer
// ======================================

di.register("Renderer", (c) => {
  const canvas = c.get("canvas");
  return new WebGLRenderer(c, canvas);
});

di.register("Engine", (c) => {
  return new Engine(c);
});


function bootstrap() {
  const engine = di.get("Engine");

  console.log("🚀 3D Robotics Simulation Started");

  engine.start();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
