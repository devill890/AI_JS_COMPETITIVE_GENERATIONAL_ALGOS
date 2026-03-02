// ======================================
// Vec3.js
// 3D Vector Math (Physics Grade)
// ======================================

export class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  // ======================================
  // BASIC SETTERS
  // ======================================

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone() {
    return new Vec3(this.x, this.y, this.z);
  }

  // ======================================
  // ARITHMETIC (MUTATING)
  // ======================================

  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  multiply(v) {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }

  addScaled(v, s) {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    return this;
  }

  addScaledVector(v, s) {
    return this.addScaled(v, s);
  }

  // ======================================
  // LENGTH OPERATIONS
  // ======================================

  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length() {
    return Math.sqrt(this.lengthSq());
  }

  normalize() {
    const len = this.length();

    if (len > 0) {
      const inv = 1 / len;
      this.x *= inv;
      this.y *= inv;
      this.z *= inv;
    }

    return this;
  }

  distanceTo(v) {
    return Math.sqrt(this.distanceToSquared(v));
  }

  distanceToSquared(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;

    return dx * dx + dy * dy + dz * dz;
  }

  // ======================================
  // PRODUCTS
  // ======================================

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v) {
    const x = this.y * v.z - this.z * v.y;
    const y = this.z * v.x - this.x * v.z;
    const z = this.x * v.y - this.y * v.x;

    this.x = x;
    this.y = y;
    this.z = z;

    return this;
  }

  // ======================================
  // PHYSICS HELPERS
  // ======================================

  projectOnVector(v) {
    const denom = v.lengthSq();
    if (denom === 0) return this.set(0, 0, 0);

    const scalar = this.dot(v) / denom;
    return this.copy(v).scale(scalar);
  }

  reflect(normal) {
    // r = v - 2(v·n)n
    const d = this.dot(normal) * 2;

    this.x -= d * normal.x;
    this.y -= d * normal.y;
    this.z -= d * normal.z;

    return this;
  }

  lerp(v, t) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }

  // ======================================
  // UTILITIES
  // ======================================

  equals(v, eps = 1e-6) {
    return (
      Math.abs(this.x - v.x) < eps &&
      Math.abs(this.y - v.y) < eps &&
      Math.abs(this.z - v.z) < eps
    );
  }

  toArray(out = [], offset = 0) {
    out[offset] = this.x;
    out[offset + 1] = this.y;
    out[offset + 2] = this.z;
    return out;
  }

  fromArray(arr, offset = 0) {
    this.x = arr[offset];
    this.y = arr[offset + 1];
    this.z = arr[offset + 2];
    return this;
  }

  // ======================================
  // STATIC HELPERS (NO MUTATION)
  // ======================================

  static add(a, b) {
    return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  static sub(a, b) {
    return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  static scale(v, s) {
    return new Vec3(v.x * s, v.y * s, v.z * s);
  }

  static dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  static cross(a, b) {
    return new Vec3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x,
    );
  }

  static zero() {
    return new Vec3(0, 0, 0);
  }
}
