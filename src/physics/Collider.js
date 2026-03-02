// ======================================
// Collider.js
// Base Collider Definition
// ======================================

import { Vec3 } from "../math.js/Vec3.js";

export const ColliderType = {
  SPHERE: "sphere",
  BOX: "box",
  PLANE: "plane",
  CAPSULE: "capsule",
  MESH: "mesh",
};

export class Collider {
  constructor(options = {}) {
    // ----------------------------------
    // Shape Type
    // ----------------------------------

    this.type = options.type ?? "unknown";

    // ----------------------------------
    // Local Transform (relative to body)
    // ----------------------------------

    this.offset = options.offset?.clone() || new Vec3();
    this.rotation = options.rotation?.clone?.() ?? null;

    // ----------------------------------
    // Collision Properties
    // ----------------------------------

    this.isTrigger = options.isTrigger ?? false;

    this.collisionGroup = options.collisionGroup ?? 1;
    this.collisionMask = options.collisionMask ?? 0xffffffff;

    // ----------------------------------
    // Runtime References
    // ----------------------------------

    this.body = null;

    // world-space cached data
    this.worldPosition = new Vec3();

    // bounding radius (used by broadphase)
    this.boundingRadius = options.boundingRadius ?? 1;
  }

  // ======================================
  // Attach to rigid body
  // ======================================

  attach(body) {
    this.body = body;
    body.collider = this;
  }

  // ======================================
  // Update world transform
  // Called every physics step
  // ======================================

  updateWorldTransform() {
    if (!this.body) return;

    // For now:
    // worldPos = bodyPos + offset
    // (rotation support added later)

    this.worldPosition.copy(this.body.position).add(this.offset);
  }

  // ======================================
  // Collision filtering
  // ======================================

  canCollide(other) {
    return (
      (this.collisionMask & other.collisionGroup) !== 0 &&
      (other.collisionMask & this.collisionGroup) !== 0
    );
  }

  // ======================================
  // Broadphase test (sphere approximation)
  // ======================================

  intersectsBroadphase(other) {
    const dx = this.worldPosition.x - other.worldPosition.x;
    const dy = this.worldPosition.y - other.worldPosition.y;
    const dz = this.worldPosition.z - other.worldPosition.z;

    const r = this.boundingRadius + other.boundingRadius;

    return dx * dx + dy * dy + dz * dz <= r * r;
  }

  // ======================================
  // Narrowphase placeholder
  // (implemented per shape pair)
  // ======================================

  testCollision(/* other */) {
    throw new Error(`Collision test not implemented for ${this.type}`);
  }
}
