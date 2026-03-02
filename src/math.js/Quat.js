// ======================================
// Quat.js
// Quaternion Math (Rotation)
// ======================================

import { Vec3 } from "./Vec3.js";

export class Quat {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  // ======================================
  // BASIC OPERATIONS
  // ======================================

  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  copy(q) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }

  clone() {
    return new Quat(this.x, this.y, this.z, this.w);
  }

  identity() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
    return this;
  }

  // ======================================
  // NORMALIZATION
  // ======================================

  lengthSq() {
    return (
      this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w
    );
  }

  length() {
    return Math.sqrt(this.lengthSq());
  }

  normalize() {
    const len = this.length();

    if (len === 0) {
      return this.identity();
    }

    const inv = 1 / len;

    this.x *= inv;
    this.y *= inv;
    this.z *= inv;
    this.w *= inv;

    return this;
  }

  // ======================================
  // MULTIPLICATION (Rotation Composition)
  // this = this * q
  // ======================================

  multiply(q) {
    const ax = this.x,
      ay = this.y,
      az = this.z,
      aw = this.w;
    const bx = q.x,
      by = q.y,
      bz = q.z,
      bw = q.w;

    this.x = aw * bx + ax * bw + ay * bz - az * by;
    this.y = aw * by - ax * bz + ay * bw + az * bx;
    this.z = aw * bz + ax * by - ay * bx + az * bw;
    this.w = aw * bw - ax * bx - ay * by - az * bz;

    return this;
  }

  // ======================================
  // INVERSE / CONJUGATE
  // ======================================

  conjugate() {
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
    return this;
  }

  invert() {
    return this.conjugate().normalize();
  }

  // ======================================
  // ROTATE VECTOR
  // v' = q * v * q^-1
  // ======================================

  rotateVector(v, out = new Vec3()) {
    const x = v.x,
      y = v.y,
      z = v.z;
    const qx = this.x,
      qy = this.y,
      qz = this.z,
      qw = this.w;

    // quat * vector
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;

    // result * inverse quat
    out.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    return out;
  }

  // ======================================
  // AXIS-ANGLE
  // ======================================

  setFromAxisAngle(axis, angle) {
    const half = angle * 0.5;
    const s = Math.sin(half);

    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(half);

    return this;
  }

  // ======================================
  // FROM EULER (radians)
  // ======================================

  setFromEuler(x, y, z) {
    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);

    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    this.x = s1 * c2 * c3 + c1 * s2 * s3;
    this.y = c1 * s2 * c3 - s1 * c2 * s3;
    this.z = c1 * c2 * s3 + s1 * s2 * c3;
    this.w = c1 * c2 * c3 - s1 * s2 * s3;

    return this;
  }

  // ======================================
  // SLERP (Smooth Rotation)
  // ======================================

  slerp(q, t) {
    let cosHalfTheta =
      this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;

    if (cosHalfTheta < 0) {
      this.x = -q.x;
      this.y = -q.y;
      this.z = -q.z;
      this.w = -q.w;
      cosHalfTheta = -cosHalfTheta;
    }

    if (cosHalfTheta >= 1.0) return this;

    const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;

    if (sqrSinHalfTheta < 0.001) {
      this.x += t * (q.x - this.x);
      this.y += t * (q.y - this.y);
      this.z += t * (q.z - this.z);
      this.w += t * (q.w - this.w);
      return this.normalize();
    }

    const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
    const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    this.x = this.x * ratioA + q.x * ratioB;
    this.y = this.y * ratioA + q.y * ratioB;
    this.z = this.z * ratioA + q.z * ratioB;
    this.w = this.w * ratioA + q.w * ratioB;

    return this;
  }

  // ======================================
  // ANGULAR VELOCITY INTEGRATION
  // (CRITICAL for rigid bodies)
  // ======================================

  integrateAngularVelocity(omega, dt) {
    // omega = angular velocity vector

    const halfDt = dt * 0.5;

    const ox = omega.x * halfDt;
    const oy = omega.y * halfDt;
    const oz = omega.z * halfDt;

    const q = new Quat(ox, oy, oz, 0);

    q.multiply(this);

    this.x += q.x;
    this.y += q.y;
    this.z += q.z;
    this.w += q.w;

    return this.normalize();
  }

  // ======================================
  // STATIC HELPERS
  // ======================================

  static identity() {
    return new Quat(0, 0, 0, 1);
  }
}
