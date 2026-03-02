// ======================================
// WanderBehavior.js
// Autonomous exploration behavior
// ======================================

import { Vec3 } from "../../math.js/Vec3.js";

export class WanderBehavior {
  constructor(options = {}) {
    // movement strength
    this.force = options.force ?? 8;

    // how quickly direction changes
    this.jitter = options.jitter ?? 1.5;

    // forward projection distance
    this.distance = options.distance ?? 3;

    // wander circle radius
    this.radius = options.radius ?? 2;

    // internal state
    this.wanderTarget = new Vec3(1, 0, 0);

    // optional obstacle sensor
    this.sensor = options.sensor ?? null;
  }

  // ======================================
  // BEHAVIOR UPDATE
  // ======================================

  update(agent, dt) {
    const body = agent.body;

    // ----------------------------------
    // Random jitter
    // ----------------------------------

    this.wanderTarget.x += (Math.random() - 0.5) * this.jitter;

    this.wanderTarget.z += (Math.random() - 0.5) * this.jitter;

    this.wanderTarget.normalize();
    this.wanderTarget.scale(this.radius);

    // ----------------------------------
    // Project forward
    // ----------------------------------

    const forward =
      body.velocity.lengthSq() > 0.0001
        ? body.velocity.clone().normalize()
        : new Vec3(0, 0, 1);

    const circleCenter = forward.clone().scale(this.distance);

    const target = circleCenter.add(this.wanderTarget);

    // ----------------------------------
    // Obstacle avoidance (optional)
    // ----------------------------------

    if (this.sensor) {
      this.sensor.update();

      if (this.sensor.hasHit()) {
        // steer away from obstacle
        const avoid = this.sensor.hitNormal.clone();

        agent.move(avoid, this.force * 2);
        return;
      }
    }

    // ----------------------------------
    // Apply steering force
    // ----------------------------------

    agent.move(target, this.force);
  }
}
