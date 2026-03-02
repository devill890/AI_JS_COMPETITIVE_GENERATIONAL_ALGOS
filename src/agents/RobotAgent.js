// ======================================
// RobotAgent.js
// Autonomous Robot Agent
// ======================================

import { Vec3 } from "../math.js/Vec3.js";

export class RobotAgent {
  constructor(container, options = {}) {
    // ----------------------------------
    // Dependency Injection
    // ----------------------------------

    this.container = container;

    this.physicsWorld = container.get("PhysicsWorld");

    this.time = container.get("Time");

    // ----------------------------------
    // Identity
    // ----------------------------------

    this.id = options.id ?? crypto.randomUUID();

    // ----------------------------------
    // Physical Representation
    // ----------------------------------

    this.body = options.body;
    this.sensors = [];

    if (!this.body) {
      throw new Error("RobotAgent requires a RigidBody");
    }

    // ----------------------------------
    // Behavior System
    // ----------------------------------

    this.behaviors = [];

    this.enabled = true;

    // internal state storage
    this.state = {};

    // interaction memory
    this.perception = {
      nearbyBodies: [],
      triggers: [],
    };

    // register into world
    this.physicsWorld.addBody(this.body);
  }

  // ======================================
  // SENSOR MANAGEMENT
  // ======================================

  addSensor(collider) {
    collider.isTrigger = true;
    collider.attach(this.body);

    this.sensors.push(collider);
  }

  // ======================================
  // BEHAVIOR SYSTEM
  // ======================================

  addBehavior(behaviorFn) {
    this.behaviors.push(behaviorFn);
  }

  // ======================================
  // PERCEPTION UPDATE
  // (called by interaction system)
  // ======================================

  setPerception(data) {
    this.perception = data;
  }

  // ======================================
  // MAIN AGENT UPDATE
  // ======================================

  update(dt) {
    if (!this.enabled) return;

    // run behaviors
    for (const behavior of this.behaviors) {
      behavior(this, dt);
    }
  }

  // ======================================
  // MOVEMENT HELPERS
  // ======================================

  move(direction, force = 10) {
    const dir = direction.clone().normalize();

    this.body.applyForce(dir.scale(force));
  }

  stop() {
    this.body.velocity.set(0, 0, 0);
  }

  rotate(axis, torque = 5) {
    this.body.applyTorque(axis.clone().normalize().scale(torque));
  }

  // ======================================
  // SIMPLE SEEK BEHAVIOR
  // ======================================

  seek(targetPosition, strength = 15) {
    const desired = Vec3.sub(targetPosition, this.body.position);

    this.move(desired, strength);
  }

  // ======================================
  // LOOK AT TARGET
  // ======================================

  lookAt(targetPosition, torque = 3) {
    const forward = new Vec3(0, 0, 1);

    const toTarget = Vec3.sub(targetPosition, this.body.position).normalize();

    const axis = Vec3.cross(forward, toTarget);

    this.rotate(axis, torque);
  }
}
