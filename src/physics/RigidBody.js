// ======================================
// RigidBody.js
// Core Rigid Body Physics Object
// ======================================

import { Vec3 } from "../math.js/Vec3.js";
import { Quat } from "../math.js/Quat.js";

export class RigidBody {
  constructor(options = {}) {
    // ----------------------------------
    // Transform
    // ----------------------------------

    this.position = options.position?.clone() || new Vec3();
    this.rotation = options.rotation?.clone() || new Quat();

    this.scale = options.scale?.clone?.() || new Vec3(1, 1, 1);

    // ----------------------------------
    // Velocities
    // ----------------------------------

    this.velocity = new Vec3();
    this.angularVelocity = new Vec3();

    // ----------------------------------
    // Accumulators
    // ----------------------------------

    this.force = new Vec3();
    this.torque = new Vec3();

    // ----------------------------------
    // Mass Properties
    // ----------------------------------

    this.mass = options.mass ?? 1;
    this.invMass = this.mass > 0 ? 1 / this.mass : 0;

    // inertia tensor (simplified scalar)
    this.inertia = options.inertia ?? this.mass;
    this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0;

    this.linearDamping = options.linearDamping ?? 0.1;
    this.angularDamping = options.angularDamping ?? 0.1;
    // ----------------------------------
    // Material
    // ----------------------------------

    this.restitution = options.restitution ?? 0.2;
    this.friction = options.friction ?? 0.5;

    // ----------------------------------
    // State Flags
    // ----------------------------------

    this.isStatic = options.isStatic ?? false;
    this.useGravity = options.useGravity ?? true;

    if (this.isStatic) {
      this.invMass = 0;
      this.invInertia = 0;
    }

    // ----------------------------------
    // Sleeping (future optimization)
    // ----------------------------------

    this.sleeping = false;

    // ----------------------------------
    // Shape placeholder
    // (used by collision system later)
    // ----------------------------------

    this.collider = options.collider ?? null;
  }

  // ======================================
  // FORCE APPLICATION
  // ======================================

  applyForce(force) {
    this.force.add(force);
  }

  applyImpulse(impulse) {
    if (this.invMass === 0) return;

    this.velocity.addScaledVector(impulse, this.invMass);
  }

  applyTorque(torque) {
    this.torque.add(torque);
  }

  applyAngularImpulse(impulse) {
    if (this.invInertia === 0) return;

    this.angularVelocity.addScaledVector(impulse, this.invInertia);
  }

  // ======================================
  // INTEGRATION STEP
  // Semi-Implicit Euler (stable)
  // ======================================

  integrate(dt, gravity) {
    if (this.invMass === 0 || this.sleeping) return;

    // ---------- Linear Motion ----------

    if (this.useGravity && gravity) {
      this.velocity.addScaledVector(gravity, dt);
    }

    // a = F/m
    this.velocity.addScaledVector(this.force, this.invMass * dt);

    const linearDamp = Math.max(0, 1 - this.linearDamping * dt);
    this.velocity.scale(linearDamp);

    // x += v * dt
    this.position.addScaledVector(this.velocity, dt);

    // ---------- Angular Motion ----------

    this.angularVelocity.addScaledVector(this.torque, this.invInertia * dt);
    const angularDamp = Math.max(0, 1 - this.angularDamping * dt);
    this.angularVelocity.scale(angularDamp);

    this.integrateRotation(dt);

    // ---------- Clear accumulators ----------
    this.clearForces();
  }

  // ======================================
  // ROTATION INTEGRATION
  // dq/dt = 0.5 * w * q
  // ======================================

  integrateRotation(dt) {
    const wx = this.angularVelocity.x;
    const wy = this.angularVelocity.y;
    const wz = this.angularVelocity.z;

    const q = this.rotation;

    const halfDt = 0.5 * dt;

    const dx = halfDt * (wx * q.w + wy * q.z - wz * q.y);
    const dy = halfDt * (wy * q.w + wz * q.x - wx * q.z);
    const dz = halfDt * (wz * q.w + wx * q.y - wy * q.x);
    const dw = -halfDt * (wx * q.x + wy * q.y + wz * q.z);

    q.x += dx;
    q.y += dy;
    q.z += dz;
    q.w += dw;

    q.normalize();
  }

  // ======================================
  // CLEAR FORCES
  // ======================================

  clearForces() {
    this.force.set(0, 0, 0);
    this.torque.set(0, 0, 0);
  }

  // ======================================
  // ENERGY (useful for debugging)
  // ======================================

  kineticEnergy() {
    const v2 = this.velocity.lengthSq();
    return 0.5 * this.mass * v2;
  }

  // ======================================
  // Utility
  // ======================================

  setPosition(x, y, z) {
    this.position.set(x, y, z);
  }

  setVelocity(x, y, z) {
    this.velocity.set(x, y, z);
  }
}
