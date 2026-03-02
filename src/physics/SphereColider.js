// ======================================
// SphereCollider.js
// Sphere Collision Shape
// ======================================

import { Collider, ColliderType } from "./Collider.js";

export class SphereCollider extends Collider {
  constructor(radius = 0.5, options = {}) {
    super({
      ...options,
      type: ColliderType.SPHERE,
      boundingRadius: radius,
    });

    this.radius = radius;
  }

  // ======================================
  // Narrowphase Collision (Sphere vs Sphere)
  // ======================================

  testCollision(other) {
    if (other.type !== ColliderType.SPHERE) {
      return null;
    }

    const dx = other.worldPosition.x - this.worldPosition.x;
    const dy = other.worldPosition.y - this.worldPosition.y;
    const dz = other.worldPosition.z - this.worldPosition.z;

    const distSq = dx * dx + dy * dy + dz * dz;
    const radiusSum = this.radius + other.radius;

    if (distSq > radiusSum * radiusSum) {
      return null;
    }

    const dist = Math.sqrt(distSq) || 0.0001;

    return {
      normal: {
        x: dx / dist,
        y: dy / dist,
        z: dz / dist,
      },
      penetration: radiusSum - dist,
    };
  }
}
