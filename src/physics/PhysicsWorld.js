// ======================================
// PhysicsWorld.js
// Central Physics Simulation Manager
// ======================================

import { Vec3 } from "../math.js/Vec3.js";

export class PhysicsWorld {
  constructor(options = {}) {
    // ----------------------------------
    // Simulation Settings
    // ----------------------------------

    this.gravity = options.gravity || new Vec3(0, -9.81, 0);

    this.fixedTimeStep = options.fixedTimeStep ?? 1 / 60;
    this.maxSubSteps = options.maxSubSteps ?? 5;

    // ----------------------------------
    // World State
    // ----------------------------------

    this.bodies = [];
    this.colliders = [];
    this.constraints = [];

    // accumulator for fixed stepping
    this._accumulator = 0;
  }

  // ======================================
  // ADD / REMOVE
  // ======================================

  addBody(body) {
    this.bodies.push(body);

    if (body.collider) {
      this.colliders.push(body.collider);
    }
  }

  removeBody(body) {
    this.bodies = this.bodies.filter((b) => b !== body);

    if (body.collider) {
      this.colliders = this.colliders.filter((c) => c !== body.collider);
    }
  }

  addConstraint(constraint) {
    this.constraints.push(constraint);
  }

  // ======================================
  // MAIN STEP (called every frame)
  // ======================================

  step(dt) {
    this._accumulator += dt;

    let substeps = 0;

    while (
      this._accumulator >= this.fixedTimeStep &&
      substeps < this.maxSubSteps
    ) {
      this.internalStep(this.fixedTimeStep);

      this._accumulator -= this.fixedTimeStep;
      substeps++;
    }
  }

  // ======================================
  // INTERNAL FIXED STEP
  // ======================================

  internalStep(dt) {
    // 1️⃣ Update collider transforms
    for (const c of this.colliders) {
      c.updateWorldTransform();
    }

    // 2️⃣ Integrate forces
    for (const body of this.bodies) {
      body.integrate(dt, this.gravity);
    }

    // 3️⃣ Collision detection
    const contacts = this.detectCollisions();

    // 4️⃣ Resolve collisions
    this.resolveContacts(contacts);

    // 5️⃣ Solve constraints (robot joints later)
    for (const constraint of this.constraints) {
      constraint.solve?.(dt);
    }
  }

  // ======================================
  // COLLISION DETECTION
  // ======================================

  detectCollisions() {
    const contacts = [];

    const n = this.colliders.length;

    for (let i = 0; i < n; i++) {
      const a = this.colliders[i];

      for (let j = i + 1; j < n; j++) {
        const b = this.colliders[j];

        if (!a.canCollide(b)) continue;

        // Broadphase
        if (!a.intersectsBroadphase(b)) continue;

        // Narrowphase
        const contact = this.narrowphase(a, b);

        if (contact) contacts.push(contact);
      }
    }

    return contacts;
  }

  // ======================================
  // SIMPLE NARROWPHASE (Sphere-Sphere)
  // Extend later for boxes etc.
  // ======================================

  narrowphase(a, b) {
    if (a.type !== "sphere" || b.type !== "sphere") return null;

    const pa = a.worldPosition;
    const pb = b.worldPosition;

    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const dz = pb.z - pa.z;

    const distSq = dx * dx + dy * dy + dz * dz;
    const r = a.boundingRadius + b.boundingRadius;

    if (distSq > r * r) return null;

    const dist = Math.sqrt(distSq) || 0.0001;

    const normal = new Vec3(dx / dist, dy / dist, dz / dist);

    return {
      a: a.body,
      b: b.body,
      normal,
      penetration: r - dist,
    };
  }

  // ======================================
  // COLLISION RESPONSE
  // Impulse-based solver
  // ======================================

  resolveContacts(contacts) {
    for (const c of contacts) {
      const A = c.a;
      const B = c.b;

      if (!A || !B) continue;

      const normal = c.normal;

      // relative velocity
      const rv = Vec3.sub(B.velocity, A.velocity);

      const velAlongNormal = rv.dot(normal);

      // separating
      if (velAlongNormal > 0) continue;

      const restitution = Math.min(A.restitution, B.restitution);

      const invMassSum = A.invMass + B.invMass;
      if (invMassSum === 0) continue;

      // impulse scalar
      const j = (-(1 + restitution) * velAlongNormal) / invMassSum;

      const impulse = normal.clone().scale(j);

      A.applyImpulse(impulse.clone().scale(-1));
      B.applyImpulse(impulse);

      // -------- Position correction --------
      const percent = 0.8;
      const slop = 0.01;

      const correctionMag =
        (Math.max(c.penetration - slop, 0) / invMassSum) * percent;

      const correction = normal.clone().scale(correctionMag);

      A.position.addScaledVector(correction, -A.invMass);

      B.position.addScaledVector(correction, B.invMass);
    }
  }
}
