// ======================================
// HingeJoint.js
// Rotational Constraint (1 DOF)
// ======================================

import { Vec3 } from "../../math/Vec3.js";

export class HingeJoint {
  constructor(bodyA, bodyB, options = {}) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;

    // ----------------------------------
    // Anchor points (local space)
    // ----------------------------------

    this.localAnchorA = options.anchorA?.clone() || new Vec3();

    this.localAnchorB = options.anchorB?.clone() || new Vec3();

    // hinge axis (world-space for now)
    this.axis = options.axis?.clone().normalize() || new Vec3(0, 1, 0);

    // ----------------------------------
    // Limits
    // ----------------------------------

    this.enableLimits = options.enableLimits ?? false;
    this.minAngle = options.minAngle ?? -Math.PI;
    this.maxAngle = options.maxAngle ?? Math.PI;

    // ----------------------------------
    // Motor (robot actuator)
    // ----------------------------------

    this.enableMotor = options.enableMotor ?? false;
    this.motorSpeed = options.motorSpeed ?? 0;
    this.maxMotorTorque = options.maxMotorTorque ?? 10;

    // bias factor stabilizes constraint
    this.biasFactor = 0.2;
  }

  // ======================================
  // SOLVER ENTRY (called each iteration)
  // ======================================

  solve(dt) {
    this.solvePositionConstraint(dt);
    this.solveMotor(dt);
  }

  // ======================================
  // KEEP ANCHORS TOGETHER
  // ======================================

  solvePositionConstraint(dt) {
    const A = this.bodyA;
    const B = this.bodyB;

    if (!A || !B) return;

    // world anchors (simplified)
    const worldA = A.position.clone().add(this.localAnchorA);

    const worldB = B.position.clone().add(this.localAnchorB);

    const error = Vec3.sub(worldB, worldA);

    const invMassSum = A.invMass + B.invMass;
    if (invMassSum === 0) return;

    // correction impulse
    const correction = error.scale(this.biasFactor / invMassSum);

    A.position.addScaledVector(correction, A.invMass);

    B.position.addScaledVector(correction, -B.invMass);

    // restrict relative motion perpendicular to hinge axis
    this.restrictAngularError();
  }

  // ======================================
  // LIMIT ROTATION TO HINGE AXIS
  // ======================================

  restrictAngularError() {
    const A = this.bodyA;
    const B = this.bodyB;

    const relAngVel = Vec3.sub(B.angularVelocity, A.angularVelocity);

    // remove components not aligned with hinge axis
    const axisComponent = this.axis.clone().scale(relAngVel.dot(this.axis));

    const correction = relAngVel.sub(axisComponent);

    A.angularVelocity.addScaledVector(correction, 0.5);

    B.angularVelocity.addScaledVector(correction, -0.5);
  }

  // ======================================
  // MOTOR (ACTUATOR)
  // ======================================

  solveMotor(dt) {
    if (!this.enableMotor) return;

    const A = this.bodyA;
    const B = this.bodyB;

    const relVel = Vec3.sub(B.angularVelocity, A.angularVelocity);

    const currentSpeed = relVel.dot(this.axis);

    const error = this.motorSpeed - currentSpeed;

    let impulse = error;

    // clamp torque
    impulse = Math.max(
      -this.maxMotorTorque,
      Math.min(this.maxMotorTorque, impulse),
    );

    const motorImpulse = this.axis.clone().scale(impulse);

    A.applyAngularImpulse(motorImpulse.clone().scale(-1));

    B.applyAngularImpulse(motorImpulse);
  }
}
