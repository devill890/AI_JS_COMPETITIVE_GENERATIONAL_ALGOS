// ======================================
// RaySensor.js
// Raycast-based perception sensor
// ======================================

import { Vec3 } from "../../math.js/Vec3.js";

export class RaySensor {
  constructor(container, options = {}) {
    // ----------------------------------
    // Dependencies (DI)
    // ----------------------------------

    this.container = container;
    this.physicsWorld = container.get("PhysicsWorld");

    // ----------------------------------
    // Configuration
    // ----------------------------------

    this.localOrigin = options.origin?.clone() || new Vec3();

    this.localDirection = (
      options.direction?.clone() || new Vec3(0, 0, 1)
    ).normalize();

    this.length = options.length ?? 10;

    this.detectTriggers = options.detectTriggers ?? false;

    this.debug = options.debug ?? false;

    // ----------------------------------
    // Runtime
    // ----------------------------------

    this.body = null;

    this.hit = null;
    this.hitDistance = Infinity;
    this.hitPoint = new Vec3();
    this.hitNormal = new Vec3();
  }

  // ======================================
  // ATTACH TO AGENT BODY
  // ======================================

  attach(body) {
    this.body = body;
  }

  // ======================================
  // UPDATE SENSOR
  // ======================================

  update() {
    if (!this.body) return;

    const origin = this.body.position.clone().add(this.localOrigin);

    const direction = this.localDirection.clone().normalize();

    let closest = Infinity;
    let bestHit = null;

    const colliders = this.physicsWorld.colliders;

    for (const collider of colliders) {
      if (!collider.body || collider.body === this.body) continue;

      if (!this.detectTriggers && collider.isTrigger) continue;

      const result = this.intersectCollider(origin, direction, collider);

      if (!result) continue;

      if (result.distance < closest) {
        closest = result.distance;
        bestHit = result;
      }
    }

    if (bestHit) {
      this.hit = bestHit.collider.body;
      this.hitDistance = bestHit.distance;
      this.hitPoint.copy(bestHit.point);
      this.hitNormal.copy(bestHit.normal);
    } else {
      this.clearHit();
    }
  }

  // ======================================
  // COLLIDER INTERSECTION
  // (Sphere for now — extend later)
  // ======================================

  intersectCollider(origin, dir, collider) {
    if (collider.type !== "sphere") return null;

    const center = collider.worldPosition;
    const radius = collider.boundingRadius;

    const oc = Vec3.sub(origin, center);

    const a = dir.dot(dir);
    const b = 2 * oc.dot(dir);
    const c = oc.dot(oc) - radius * radius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);

    if (t < 0 || t > this.length) return null;

    const point = origin.clone().addScaledVector(dir, t);

    const normal = Vec3.sub(point, center).normalize();

    return {
      collider,
      distance: t,
      point,
      normal,
    };
  }

  // ======================================
  // RESET HIT
  // ======================================

  clearHit() {
    this.hit = null;
    this.hitDistance = Infinity;
  }

  // ======================================
  // QUERY HELPERS
  // ======================================

  hasHit() {
    return this.hit !== null;
  }

  getDistance() {
    return this.hitDistance;
  }
}
