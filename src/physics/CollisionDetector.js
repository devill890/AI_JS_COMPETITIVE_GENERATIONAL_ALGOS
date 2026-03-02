// ======================================
// CollisionDetector.js
// Broadphase + Narrowphase Collision System
// ======================================

import { Vec3 } from "../math/Vec3.js";

export class CollisionDetector {
  constructor() {
    // registry for narrowphase handlers
    // key = "typeA|typeB"
    this.handlers = new Map();

    this.registerDefaultHandlers();
  }

  // ======================================
  // PUBLIC API
  // ======================================

  detect(colliders) {
    const contacts = [];
    const n = colliders.length;

    for (let i = 0; i < n; i++) {
      const a = colliders[i];

      for (let j = i + 1; j < n; j++) {
        const b = colliders[j];

        if (!a.canCollide(b)) continue;

        // ---- Broadphase ----
        if (!this.broadphase(a, b)) continue;

        // ---- Narrowphase ----
        const contact = this.narrowphase(a, b);

        if (contact) contacts.push(contact);
      }
    }

    return contacts;
  }

  // ======================================
  // BROADPHASE
  // (Bounding sphere approximation)
  // ======================================

  broadphase(a, b) {
    return a.intersectsBroadphase(b);
  }

  // ======================================
  // NARROWPHASE DISPATCH
  // ======================================

  narrowphase(a, b) {
    const keyAB = `${a.type}|${b.type}`;
    const keyBA = `${b.type}|${a.type}`;

    if (this.handlers.has(keyAB)) {
      return this.handlers.get(keyAB)(a, b);
    }

    if (this.handlers.has(keyBA)) {
      const result = this.handlers.get(keyBA)(b, a);

      // flip normal if reversed
      if (result) {
        result.normal.scale(-1);
        [result.a, result.b] = [result.b, result.a];
      }

      return result;
    }

    return null;
  }

  // ======================================
  // REGISTER HANDLER
  // ======================================

  register(typeA, typeB, fn) {
    this.handlers.set(`${typeA}|${typeB}`, fn);
  }

  // ======================================
  // DEFAULT COLLISION TYPES
  // ======================================

  registerDefaultHandlers() {
    // Sphere vs Sphere
    this.register("sphere", "sphere", (a, b) => this.sphereSphere(a, b));
  }

  // ======================================
  // SPHERE-SPHERE COLLISION
  // ======================================

  sphereSphere(a, b) {
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
      colliderA: a,
      colliderB: b,
      normal,
      penetration: r - dist,
      contactPoint: new Vec3(
        pa.x + normal.x * a.boundingRadius,
        pa.y + normal.y * a.boundingRadius,
        pa.z + normal.z * a.boundingRadius,
      ),
    };
  }
}
