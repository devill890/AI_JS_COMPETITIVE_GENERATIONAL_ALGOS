// ======================================
// AgentFactory.js
// Builds robot agents with per-generation variety
// ======================================

import { Vec3 } from "../math.js/Vec3.js";
import { RigidBody } from "../physics/RigidBody.js";
import { SphereCollider } from "../physics/SphereColider.js";

export class AgentFactory {
  constructor(arenaManager, options = {}) {
    this.arenaManager = arenaManager;
    this.sizeRange = options.sizeRange ?? { min: 0.6, max: 0.95 };
    this.fireRateRange = options.fireRateRange ?? { min: 0.35, max: 0.8 };
    this.massRange = options.massRange ?? { min: 0.55, max: 1.45 };
  }

  create(index, total, genome, teamIndex, teamColor) {
    const angle = (index / Math.max(1, total)) * Math.PI * 2;
    const radius = this.arenaManager.spawnRadius();
    const span = this.arenaManager.getCaptureCenter();
    const spawn = new Vec3(
      span.x + Math.cos(angle) * radius,
      this.arenaManager.getCombatHeight(),
      span.z + Math.sin(angle) * radius,
    );

    const size =
      this.sizeRange.min +
      Math.random() * (this.sizeRange.max - this.sizeRange.min);

    const mass =
      this.massRange.min +
      Math.random() * (this.massRange.max - this.massRange.min);

    const body = new RigidBody({
      mass,
      position: spawn,
      scale: new Vec3(size, size, size),
      linearDamping: 0.08 + Math.random() * 0.12,
      angularDamping: 0.08 + Math.random() * 0.18,
    });

    const collider = new SphereCollider(size * 0.7);
    collider.attach(body);

    body.useGravity = false;
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);

    const fireRate =
      this.fireRateRange.min +
      Math.random() * (this.fireRateRange.max - this.fireRateRange.min);

    const baseScale = body.scale.clone();
    const highlightScale = body.scale.clone().scale(1.5);

    return {
      id: `agent-${index}`,
      body,
      zoneTime: 0,
      fitness: 0,
      genome,
      fireCooldown: fireRate,
      fireRate,
      shots: 0,
      hits: 0,
      team: teamIndex,
      baseScale,
      highlightScale,
      size,
      color: new Vec3(teamColor.x, teamColor.y, teamColor.z),
      senseBuffer: [],
      perceptionDelay: 2,
      maxSpeed: 6 + Math.random() * 2,
      energy: 1,
      maxEnergy: 1,
      energyCost: 0.35,
      energyRegen: 0.28,
    };
  }

  refreshFireCooldown(competitor) {
    const fireRate =
      this.fireRateRange.min +
      Math.random() * (this.fireRateRange.max - this.fireRateRange.min);
    competitor.fireRate = fireRate;
    competitor.fireCooldown = fireRate;
  }
}
