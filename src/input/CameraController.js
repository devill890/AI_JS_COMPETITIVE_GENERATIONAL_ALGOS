// ======================================
// CameraController.js
// WASD + mouse input for navigating the scene
// ======================================

import { Mat4 } from "../math.js/Mat4.js";
import { Vec3 } from "../math.js/Vec3.js";

export class CameraController {
  constructor(container, options = {}) {
    this.canvas = container.get("canvas");
    this.target = options.target?.clone?.() ?? new Vec3(0, 0, 0);

    this.azimuth = options.azimuth ?? -Math.PI / 4;
    this.polar = options.polar ?? Math.PI / 3;
    this.distance = options.distance ?? 18;

    this.minPolar = 0.25;
    this.maxPolar = Math.PI - 0.3;
    this.minDistance = 5;
    this.maxDistance = 45;

    this.moveSpeed = options.moveSpeed ?? 9;
    this.rotateSpeed = options.rotateSpeed ?? 0.0025;
    this.zoomSpeed = options.zoomSpeed ?? 0.7;

    this.viewMatrix = new Mat4();
    this.projectionMatrix = new Mat4();
    this.position = new Vec3();

    this.keys = {};
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.aspect = 1;

    this._bindEvents();
    this._updateMatrices();
  }

  resize(width, height) {
    if (width && height) {
      this.aspect = width / height;
    }
  }

  update(deltaTime) {
    this._applyKeyboard(deltaTime);
    this._updateMatrices();
  }

  getViewMatrix() {
    return this.viewMatrix;
  }

  getProjectionMatrix() {
    return this.projectionMatrix;
  }

  _bindEvents() {
    window.addEventListener("keydown", (event) => {
      this.keys[event.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", (event) => {
      this.keys[event.key.toLowerCase()] = false;
    });

    this.canvas.style.cursor = "grab";

    this.canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.dragging = true;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.canvas.setPointerCapture?.(event.pointerId);
      this.canvas.style.cursor = "grabbing";
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.dragging) return;
      const deltaX = event.clientX - this.lastX;
      const deltaY = event.clientY - this.lastY;

      this.azimuth += deltaX * this.rotateSpeed;
      this.polar = Math.min(
        this.maxPolar,
        Math.max(this.minPolar, this.polar + deltaY * this.rotateSpeed),
      );

      this.lastX = event.clientX;
      this.lastY = event.clientY;
    });

    const release = (event) => {
      this.dragging = false;
      this.canvas.releasePointerCapture?.(event.pointerId);
      this.canvas.style.cursor = "grab";
    };

    this.canvas.addEventListener("pointerup", release);
    this.canvas.addEventListener("pointerleave", release);
    this.canvas.addEventListener("pointercancel", release);

    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.distance = Math.min(
        this.maxDistance,
        Math.max(this.minDistance, this.distance + event.deltaY * 0.01 * this.zoomSpeed),
      );
    });
  }

  _applyKeyboard(deltaTime) {
    if (deltaTime <= 0) return;

    const input = new Vec3();

    if (this.keys["w"]) input.z -= 1;
    if (this.keys["s"]) input.z += 1;
    if (this.keys["a"]) input.x -= 1;
    if (this.keys["d"]) input.x += 1;
    if (this.keys[" "]) input.y += 1;
    if (this.keys["shift"]) input.y -= 1;

    if (input.lengthSq() === 0) return;

    const speed = this.moveSpeed * deltaTime;
    input.normalize();
    input.scale(speed);

    const forward = new Vec3(Math.sin(this.azimuth), 0, Math.cos(this.azimuth));
    const right = new Vec3(
      Math.cos(this.azimuth),
      0,
      -Math.sin(this.azimuth),
    );

    const translation = forward
      .clone()
      .scale(input.z)
      .add(right.clone().scale(input.x));

    translation.y += input.y;

    this.target.add(translation);
  }

  _updateMatrices() {
    const sinPolar = Math.sin(this.polar);

    this.position.set(
      this.target.x + this.distance * sinPolar * Math.sin(this.azimuth),
      this.target.y + this.distance * Math.cos(this.polar),
      this.target.z + this.distance * sinPolar * Math.cos(this.azimuth),
    );

    this.viewMatrix.lookAt(this.position, this.target, new Vec3(0, 1, 0));

    const aspect = this.aspect || this.canvas.clientWidth / this.canvas.clientHeight;
    this.projectionMatrix.makePerspective(Math.PI / 3, aspect, 0.1, 160);
  }
}
