// ======================================
// Solver.js
// Iterative Impulse Solver
// ======================================

import { Vec3 } from "../math/Vec3.js";

export class Solver {
  constructor(options = {}) {
    // number of solver iterations
    this.iterations = options.iterations ?? 8;

    // position correction tuning
    this.penetrationSlop = 0.01;
    this.penetrationPercent = 0.8;
  }

  // ======================================
  // MAIN SOLVE ENTRY
  // ======================================

  solve(contacts, constraints, dt) {
    // iterative solving improves stability
    for (let i = 0; i < this.iterations; i++) {
      // resolve collision contacts
      for (const contact of contacts) {
        this.solveContact(contact);
      }

      // solve constraints (robot joints later)
      for (const c of constraints) {
        c.solve?.(dt);
      }
    }

    // positional correction once
    for (const contact of contacts) {
      this.positionalCorrection(contact);
    }
  }

  // ======================================
  // CONTACT IMPULSE SOLVER
  // ======================================

  solveContact(contact) {
    const A = contact.a;
    const B = contact.b;

    if (!A || !B) return;

    const normal = contact.normal;

    // relative velocity
    const rv = Vec3.sub(B.velocity, A.velocity);

    const velAlongNormal = rv.dot(normal);

    // objects separating
    if (velAlongNormal > 0) return;

    const restitution = Math.min(A.restitution, B.restitution);

    const invMassSum = A.invMass + B.invMass;
    if (invMassSum === 0) return;

    // impulse magnitude
    const j = (-(1 + restitution) * velAlongNormal) / invMassSum;

    const impulse = normal.clone().scale(j);

    A.applyImpulse(impulse.clone().scale(-1));
    B.applyImpulse(impulse);

    // optional friction (basic Coulomb model)
    this.applyFriction(contact, rv, normal);
  }

  // ======================================
  // FRICTION (TANGENTIAL IMPULSE)
  // ======================================

  applyFriction(contact, rv, normal) {
    const A = contact.a;
    const B = contact.b;

    const tangent = rv.clone().sub(normal.clone().scale(rv.dot(normal)));

    const lenSq = tangent.lengthSq();
    if (lenSq < 1e-6) return;

    tangent.scale(1 / Math.sqrt(lenSq));

    const invMassSum = A.invMass + B.invMass;
    if (invMassSum === 0) return;

    const jt = -rv.dot(tangent) / invMassSum;

    const friction = Math.sqrt(A.friction * B.friction);

    const maxFriction = jt * friction;

    const frictionImpulse = tangent.clone().scale(maxFriction);

    A.applyImpulse(frictionImpulse.clone().scale(-1));
    B.applyImpulse(frictionImpulse);
  }

  // ======================================
  // POSITIONAL CORRECTION
  // prevents sinking/jitter
  // ======================================

  positionalCorrection(contact) {
    const A = contact.a;
    const B = contact.b;

    const penetration = contact.penetration;
    if (penetration <= 0) return;

    const invMassSum = A.invMass + B.invMass;
    if (invMassSum === 0) return;

    const correctionMagnitude =
      (Math.max(penetration - this.penetrationSlop, 0) / invMassSum) *
      this.penetrationPercent;

    const correction = contact.normal.clone().scale(correctionMagnitude);

    A.position.addScaledVector(correction, -A.invMass);

    B.position.addScaledVector(correction, B.invMass);
  }
}
