// ======================================
// ArenaManager.js
// Encapsulates arena dimensions and gravity rules per generation
// ======================================

import { Vec3 } from "../math.js/Vec3.js";

export class ArenaManager {
  constructor(options = {}) {
    this.captureCenter = options.captureCenter?.clone?.() || new Vec3(0, 0, 0);
    this.baseRadius = options.captureRadius ?? 10;
    this.radiusVariance = options.radiusVariance ?? 4;
    this.baseZoneHeight = options.zoneHeight ?? 0.2;
    this.zoneVariance = options.zoneVariance ?? 0.12;
    this.combatBase = options.combatHeight ?? 0.4;
    this.combatVariance = options.combatVariance ?? 0.35;
    this.gravityInfluence = options.gravityInfluence ?? 14;
    this.gravityBuffer = options.gravityBuffer ?? 0.6;
    this._generation = 0;
    this.rollNextArena();
  }

  rollNextArena() {
    this._generation++;
    const radiusDelta = (Math.random() - 0.5) * this.radiusVariance;
    this.captureRadius = Math.max(6, this.baseRadius + radiusDelta);
    const zoneDelta = (Math.random() - 0.5) * this.zoneVariance;
    this.zoneHeight = Math.max(0.12, this.baseZoneHeight + zoneDelta);
    const combatDelta = Math.sin(this._generation * 0.3) * this.combatVariance;
    this.combatHeight =
      this.captureCenter.y + this.combatBase + combatDelta + Math.random() * 0.35;
    this.gravityIntensity = this.gravityInfluence * (0.7 + Math.random() * 0.6);
  }

  getCaptureCenter() {
    return this.captureCenter;
  }

  getRadius() {
    return this.captureRadius;
  }

  getZoneHeight() {
    return this.zoneHeight;
  }

  getCombatHeight() {
    return this.combatHeight;
  }

  getGravityStrength(distance) {
    const threshold = this.captureRadius + this.gravityBuffer;
    if (distance <= threshold) return 0;
    return Math.max(0, this.gravityIntensity);
  }

  needsGravity(distance) {
    return distance > this.captureRadius + this.gravityBuffer;
  }

  spawnRadius() {
    return this.captureRadius + 3 + Math.random() * 4;
  }

  getGeneration() {
    return this._generation;
  }
}
