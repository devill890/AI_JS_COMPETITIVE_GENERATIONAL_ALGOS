// ======================================
// Mat4.js
// 4x4 Matrix (Column-Major, WebGL Ready)
// ======================================

import { Vec3 } from "./Vec3.js";
import { Quat } from "./Quat.js";

export class Mat4 {
  constructor() {
    // Column-major order (WebGL)
    this.elements = new Float32Array(16);
    this.identity();
  }

  // ======================================
  // BASIC SETUP
  // ======================================

  identity() {
    const e = this.elements;

    e[0] = 1;
    e[4] = 0;
    e[8] = 0;
    e[12] = 0;
    e[1] = 0;
    e[5] = 1;
    e[9] = 0;
    e[13] = 0;
    e[2] = 0;
    e[6] = 0;
    e[10] = 1;
    e[14] = 0;
    e[3] = 0;
    e[7] = 0;
    e[11] = 0;
    e[15] = 1;

    return this;
  }

  copy(m) {
    this.elements.set(m.elements);
    return this;
  }

  clone() {
    const m = new Mat4();
    m.copy(this);
    return m;
  }

  // ======================================
  // MATRIX MULTIPLICATION
  // this = this * m
  // ======================================

  multiply(m) {
    const a = this.elements;
    const b = m.elements;

    const r = new Float32Array(16);

    for (let c = 0; c < 4; c++) {
      for (let rIdx = 0; rIdx < 4; rIdx++) {
        r[c * 4 + rIdx] =
          a[0 * 4 + rIdx] * b[c * 4 + 0] +
          a[1 * 4 + rIdx] * b[c * 4 + 1] +
          a[2 * 4 + rIdx] * b[c * 4 + 2] +
          a[3 * 4 + rIdx] * b[c * 4 + 3];
      }
    }

    this.elements = r;
    return this;
  }

  // ======================================
  // TRANSLATION
  // ======================================

  makeTranslation(v) {
    this.identity();
    this.elements[12] = v.x;
    this.elements[13] = v.y;
    this.elements[14] = v.z;
    return this;
  }

  // ======================================
  // SCALE
  // ======================================

  makeScale(v) {
    this.identity();
    this.elements[0] = v.x;
    this.elements[5] = v.y;
    this.elements[10] = v.z;
    return this;
  }

  // ======================================
  // ROTATION FROM QUATERNION
  // ======================================

  makeRotationFromQuat(q) {
    const e = this.elements;

    const x = q.x,
      y = q.y,
      z = q.z,
      w = q.w;

    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;

    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;

    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    e[0] = 1 - (yy + zz);
    e[1] = xy + wz;
    e[2] = xz - wy;
    e[3] = 0;

    e[4] = xy - wz;
    e[5] = 1 - (xx + zz);
    e[6] = yz + wx;
    e[7] = 0;

    e[8] = xz + wy;
    e[9] = yz - wx;
    e[10] = 1 - (xx + yy);
    e[11] = 0;

    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;

    return this;
  }

  // ======================================
  // COMPOSE TRANSFORM
  // position + rotation + scale
  // ======================================

  compose(position, rotation, scale) {
    this.makeRotationFromQuat(rotation);

    const e = this.elements;

    e[0] *= scale.x;
    e[1] *= scale.x;
    e[2] *= scale.x;

    e[4] *= scale.y;
    e[5] *= scale.y;
    e[6] *= scale.y;

    e[8] *= scale.z;
    e[9] *= scale.z;
    e[10] *= scale.z;

    e[12] = position.x;
    e[13] = position.y;
    e[14] = position.z;

    return this;
  }

  // ======================================
  // PERSPECTIVE PROJECTION
  // ======================================

  makePerspective(fov, aspect, near, far) {
    const e = this.elements;
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);

    e[0] = f / aspect;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;

    e[4] = 0;
    e[5] = f;
    e[6] = 0;
    e[7] = 0;

    e[8] = 0;
    e[9] = 0;
    e[10] = (far + near) * nf;
    e[11] = -1;

    e[12] = 0;
    e[13] = 0;
    e[14] = 2 * far * near * nf;
    e[15] = 0;

    return this;
  }

  // ======================================
  // LOOK AT (CAMERA MATRIX)
  // ======================================

  lookAt(eye, target, up) {
    const z = Vec3.sub(eye, target).normalize();
    const x = Vec3.cross(up, z).normalize();
    const y = Vec3.cross(z, x);

    const e = this.elements;

    e[0] = x.x;
    e[4] = x.y;
    e[8] = x.z;
    e[1] = y.x;
    e[5] = y.y;
    e[9] = y.z;
    e[2] = z.x;
    e[6] = z.y;
    e[10] = z.z;

    e[12] = -x.dot(eye);
    e[13] = -y.dot(eye);
    e[14] = -z.dot(eye);

    e[3] = 0;
    e[7] = 0;
    e[11] = 0;
    e[15] = 1;

    return this;
  }

  // ======================================
  // EXPORT FOR WEBGL
  // ======================================

  toArray() {
    return this.elements;
  }
}
