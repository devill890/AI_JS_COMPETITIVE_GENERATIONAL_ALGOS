// ======================================
// ParticleSystem.js
// Competitive AI agents with optimizer selection
// ======================================

import { Vec3 } from "../math.js/Vec3.js";
import { RigidBody } from "../physics/RigidBody.js";
import { SphereCollider } from "../physics/SphereColider.js";
import { OptimizerManager } from "../evolution/OptimizerManager.js";
import { ArenaManager } from "./ArenaManager.js";
import { AgentFactory } from "./AgentFactory.js";

const DEFAULT_TEAM_NAMES = ["Team Red", "Team Blue"];
const TEAM_BULLET_COLORS = [
  new Vec3(0.3, 1.0, 0.82), // teal
  new Vec3(1.0, 0.35, 0.95), // magenta
];

export class ParticleSystem {
  constructor(container, options = {}) {
    this.physicsWorld = container.get("PhysicsWorld");
    this.trainingOverlay = container.has("TrainingOverlay")
      ? container.get("TrainingOverlay")
      : null;
    this.progressOverlay = container.has("TeamProgressOverlay")
      ? container.get("TeamProgressOverlay")
      : null;

    this.captureCenter = options.captureCenter?.clone?.() || new Vec3(0, 0, 0);
    this.captureRadius = options.captureRadius ?? 10;
    this.zoneHeight = options.zoneHeight ?? 0.2;
    this.teamColors = options.teamColors ?? [
      new Vec3(0.9, 0.35, 0.35),
      new Vec3(0.35, 0.48, 0.95),
    ];
    this.combatHeight = options.combatHeight ?? this.captureCenter.y + 0.5;

    this.arenaManager = new ArenaManager({
      captureCenter: this.captureCenter,
      captureRadius: this.captureRadius,
      zoneHeight: this.zoneHeight,
      combatHeight: this.combatHeight,
      radiusVariance: options.radiusVariance,
      zoneVariance: options.zoneVariance,
      combatVariance: options.combatVariance,
      gravityInfluence: options.gravityInfluence,
      gravityBuffer: options.gravityBuffer,
    });

    this.agentFactory = new AgentFactory(this.arenaManager, {
      sizeRange: options.agentSizeRange,
      fireRateRange: options.fireRateRange,
    });

    this._refreshArenaState();

    this.optimizerManager = new OptimizerManager({
      populationSize: options.populationSize ?? 10,
      algorithm: options.algorithm ?? "genetic",
      geneRanges: options.geneRanges,
      params: options.optimizerParams,
    });

    this.evaluationInterval = options.evaluationInterval ?? 10;
    this._evaluationTimer = 0;

    this.avoidDistance = options.avoidDistance ?? 2.6;
    this.bulletSpeed = options.bulletSpeed ?? 22;
    this.bulletTTL = options.bulletTTL ?? 2.4;
    this.maxBullets = options.maxBullets ?? 36;

    this.competitors = [];
    this.bestAgentId = "-";
    this.bestFitness = 0;
    this.bestZoneTime = 0;
    this.status = "Warm-up";
    this.bullets = [];
    this.obstacles = [];
    this._obstaclePhase = 0;
    this.obstacleProfiles = [];
    this.eventLog = [];
    this.teamNames = options.teamNames ?? DEFAULT_TEAM_NAMES;
    this.bestTeamName = this.teamNames[0];
    this.history = [];
    this.historyLimit = options.historyLimit ?? 48;
    this.telemetryLog = [];
    this.telemetryLimit = options.telemetryLimit ?? 16;
    this.currentTelemetry = null;
    this.coverStructures = [];
    this.lastWinnerShots = 0;
    this.lastWinnerHits = 0;

    this.highlightedCompetitor = null;

    this._buildCompetitors();
    this._buildObstacles();
    this._buildCoverStructures();
    this._bindOverlay();
    this._bindProgressOverlay();
    this._collectTeamStats();
    this._pushHistoryEntry(this._teamBestFitnessSnapshot(), 0, 0);
    this._updateOverlay();
    this._recordEvent("Arena ready, battle begins");
  }

  _buildCompetitors() {
    const population = this.optimizerManager.getPopulation();
    const total = population.length;
    for (let i = 0; i < total; i++) {
      const team = i % this.teamColors.length;
      const color = this.teamColors[team];
      const competitor = this.agentFactory.create(
        i,
        total,
        population[i],
        team,
        color,
      );

      competitor.body.color = competitor.color;
      this.physicsWorld.addBody(competitor.body);
      this.competitors.push(competitor);
    }
  }

  _bindOverlay() {
    if (!this.trainingOverlay) return;

    this.trainingOverlay.setAlgorithmOptions(
      this.optimizerManager.getAlgorithmOptions(),
      this.optimizerManager.getActiveAlgorithm(),
    );

    this.trainingOverlay.bindAlgorithmChange((algorithm) => this.setAlgorithm(algorithm));
    this.trainingOverlay.bindParameterChange((name, value) =>
      this.setParameter(name, value),
    );

    this._refreshParameterUI();
    this.trainingOverlay.bindTelemetryExport(() => this._exportTelemetry());
  }

  _bindProgressOverlay() {
    if (!this.progressOverlay) return;
    this.progressOverlay.setTeamNames(this.teamNames);
  }

  _pushTelemetryEntry(entry) {
    this.currentTelemetry = entry;
    this.telemetryLog.push(entry);
    if (this.telemetryLog.length > this.telemetryLimit) {
      this.telemetryLog.shift();
    }
  }

  _exportTelemetry() {
    const payload = {
      generation: this.optimizerManager.getGenerationCount(),
      history: this.history,
      telemetry: this.telemetryLog,
      events: this.eventLog,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `telemetry-gen${this.optimizerManager.getGenerationCount()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  _clearObstacles() {
    for (const obstacle of this.obstacles) {
      this.physicsWorld.removeBody(obstacle);
    }
    this.obstacles = [];
    this.obstacleProfiles = [];
  }

  _buildObstacles() {
    const ring = this.captureRadius + 3;

    for (let i = 0; i < 3; i++) {
      const baseAngle = (i / 3) * Math.PI * 2;
      const x = this.captureCenter.x + Math.cos(baseAngle) * ring;
      const z = this.captureCenter.z + Math.sin(baseAngle) * ring;

      const wall = new RigidBody({
        mass: 0,
        position: new Vec3(x, this.combatHeight, z),
        scale: new Vec3(1.2, 1.2, 1.2),
      });

      const collider = new SphereCollider(1.2);
      collider.attach(wall);
      wall.color = new Vec3(0.2, 0.25, 0.3);

      this.physicsWorld.addBody(wall);
      this.obstacles.push(wall);
      this.obstacleProfiles.push({
        baseAngle,
        radiusBase: ring + Math.random() * 1.6,
        speed: 0.4 + Math.random() * 0.8,
        phaseOffset: Math.random() * Math.PI * 2,
        scale: 1 + Math.random() * 1.2,
        heightVariance: 0.35 + Math.random() * 0.7,
      });
    }

    this._randomizeObstacles();
  }

  _clearCoverStructures() {
    for (const cover of this.coverStructures) {
      this.physicsWorld.removeBody(cover);
    }
    this.coverStructures = [];
  }

  _buildCoverStructures() {
    this._clearCoverStructures();
    const radius = this.captureRadius * 0.6;
    for (let i = 0; i < 3; i++) {
      const angle = ((i + 0.5) / 3) * Math.PI * 2;
      const x = this.captureCenter.x + Math.cos(angle) * radius;
      const z = this.captureCenter.z + Math.sin(angle) * radius;
      const height = this.combatHeight + 0.3 + Math.random() * 0.6;
      const cover = new RigidBody({
        mass: 0,
        position: new Vec3(x, height, z),
        scale: new Vec3(1.2, 1.5 + Math.random() * 0.8, 0.6),
      });
      const collider = new SphereCollider(0.9);
      collider.attach(cover);
      cover.color = new Vec3(0.15, 0.15, 0.18);
      this.physicsWorld.addBody(cover);
      this.coverStructures.push(cover);
    }
  }

  _refreshObstacles() {
    this._clearObstacles();
    this._buildObstacles();
    this._buildCoverStructures();
  }

  _refreshArenaState() {
    this.captureCenter = this.arenaManager.getCaptureCenter();
    this.captureRadius = this.arenaManager.getRadius();
    this.zoneHeight = this.arenaManager.getZoneHeight();
    this.combatHeight = this.arenaManager.getCombatHeight();
  }

  _randomizeObstacles() {
    this._obstaclePhase = Math.random() * Math.PI * 2;
    this.obstacleProfiles.forEach((profile, index) => {
      profile.speed = 0.35 + Math.random() * 0.95;
      profile.scale = 0.9 + Math.random() * 1.2;
      profile.radiusBase =
        this.captureRadius +
        1.2 +
        Math.sin(index + profile.phaseOffset) * 0.4 +
        Math.random() * 0.6;
      profile.heightVariance = 0.25 + Math.random() * 0.7;
      profile.phaseOffset = Math.random() * Math.PI * 2;
    });
  }

  fixedUpdate(dt) {
    this._evaluationTimer += dt;
    this._updateObstacles(dt);

    for (const competitor of this.competitors) {
      this._driveCompetitor(competitor, dt);
    }

    this._updateBullets(dt);
    this._collectTeamStats();

    if (this._evaluationTimer >= this.evaluationInterval) {
      this._evaluationTimer -= this.evaluationInterval;
      this._completeGeneration();
    }
  }

  render(renderer) {
    renderer.drawCaptureZone(this.captureCenter, this.captureRadius, this.zoneHeight);
  }

  _driveCompetitor(competitor, dt) {
    const body = competitor.body;
    const params = this.decodeGenome(competitor.genome.vector);

    this._recordPerception(competitor);
    const sensorPos = this._getPerceivedPosition(competitor);

    const toZone = Vec3.sub(this.captureCenter, sensorPos);
    const distance = toZone.length();

    const direction =
      distance > 0.001 ? toZone.scale(1 / distance) : new Vec3(0, 1, 0);

    const force = direction.clone().scale(params.speed + Math.random() * params.spread * 0.8);

    body.applyForce(force);
    this._applyArenaGravity(body, distance);

    const speed = body.velocity.length();
    if (speed > competitor.maxSpeed) {
      body.velocity.scale(competitor.maxSpeed / speed);
    }

    if (distance <= this.captureRadius) {
      competitor.zoneTime += dt;
    }

    competitor.fitness =
      competitor.zoneTime * 1.4 + Math.max(0, this.captureRadius - distance) * 0.4;

    const teamColor = this.teamColors[competitor.team] ?? this.teamColors[0];
    const intensity = Math.min(1, Math.max(0.25, 1 - competitor.zoneTime / 10));
    body.color = new Vec3(
      teamColor.x * intensity,
      teamColor.y * intensity,
      teamColor.z * intensity,
    );

    if (competitor === this.highlightedCompetitor) {
      body.color = new Vec3(1, 0.95, 0.4);
    }

    competitor.fireCooldown -= dt;
    competitor.energy = Math.min(
      competitor.maxEnergy,
      competitor.energy + competitor.energyRegen * dt,
    );

    if (competitor.fireCooldown <= 0) {
      this._fireBullet(competitor);
      competitor.fireCooldown = competitor.fireRate;
    }

    this._applyBulletAvoidance(competitor);
    const floor = this.captureCenter.y - 0.6;
    if (body.position.y < floor) {
      body.position.y = floor;
    }
  }

  _recordPerception(competitor) {
    competitor.senseBuffer.unshift(competitor.body.position.clone());
    const capacity = competitor.perceptionDelay + 1;
    if (competitor.senseBuffer.length > capacity) {
      competitor.senseBuffer.pop();
    }
  }

  _getPerceivedPosition(competitor) {
    const buffer = competitor.senseBuffer;
    const index = Math.min(competitor.perceptionDelay, buffer.length - 1);
    const base = (buffer[index] ?? competitor.body.position).clone();
    const jitter = new Vec3(
      (Math.random() - 0.5) * 0.16,
      (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.16,
    );
    return base.add(jitter);
  }

  _getTargetPosition(target) {
    const jitter = new Vec3(
      (Math.random() - 0.5) * 0.18,
      (Math.random() - 0.5) * 0.12,
      (Math.random() - 0.5) * 0.18,
    );
    return target.body.position.clone().add(jitter);
  }

  _applyArenaGravity(body, distance) {
    const extraGravity = this.arenaManager.getGravityStrength(distance);
    if (extraGravity > 0) {
      body.applyForce(new Vec3(0, -extraGravity, 0));
      return;
    }

    const lift = this.combatHeight - body.position.y;
    if (Math.abs(lift) > 0.02) {
      body.applyForce(new Vec3(0, lift * 120, 0));
    }
  }

  setAlgorithm(name) {
    if (!this.optimizerManager.setAlgorithm(name)) return;
    this._syncCompetitorsToPopulation();
    this._refreshParameterUI();
    this._recordEvent(`Optimizer switched to ${name}`);
  }

  setParameter(name, value) {
    switch (name) {
      case "mutationRate":
      case "temperature":
      case "decay":
      case "explorationRate":
        this.optimizerManager.updateParams({ [name]: value });
        this._recordEvent(`Optimizer param ${name} => ${value.toFixed(2)}`);
        break;
      case "mutationFactor":
      case "crossoverRate":
      case "inertia":
      case "cognitive":
      case "social":
        this.optimizerManager.updateParams({ [name]: value });
        this._recordEvent(`Optimizer param ${name} => ${value.toFixed(2)}`);
        break;
      case "bulletSpeed":
        this.bulletSpeed = value;
        break;
      case "avoidDistance":
        this.avoidDistance = value;
        break;
      case "evaluationInterval":
        this.evaluationInterval = value;
        break;
    }

    this._refreshParameterUI();
  }

  _completeGeneration() {
    this.optimizerManager.evaluate((vector, index) => this._fitnessForIndex(index));

    const teamBest = this._teamBestFitnessSnapshot();
    const winner = this._determineBestCompetitor();

    this.bestAgentId = winner?.id ?? "-";
    this.bestFitness = winner?.fitness ?? 0;
    this.bestZoneTime = winner?.zoneTime ?? 0;
    const winnerShots = winner?.shots ?? 0;
    const winnerHits = winner?.hits ?? 0;
    const bestTeam = winner?.team ?? 0;

    this.bestTeamName = this.teamNames[bestTeam] ?? this.teamNames[0];
    this._pushHistoryEntry(teamBest, bestTeam, this.bestFitness);
    const telemetryEntry = {
      generation: this.optimizerManager.getGenerationCount(),
      bestFitness: this.bestFitness,
      bestTeam: this.bestTeamName,
      zoneTime: this.bestZoneTime,
      shots: winnerShots,
      hits: winnerHits,
      shotsPerSecond: winnerShots / Math.max(1, this.evaluationInterval),
      hitsPerSecond: winnerHits / Math.max(1, this.evaluationInterval),
      optimizer: this.optimizerManager.getActiveAlgorithm(),
      timestamp: new Date().toISOString(),
    };
    this._pushTelemetryEntry(telemetryEntry);

    this.optimizerManager.nextGeneration();
    this._syncCompetitorsToPopulation();

    this.arenaManager.rollNextArena();
    this._refreshArenaState();
    this._refreshObstacles();

    for (const competitor of this.competitors) {
      this._resetCompetitor(competitor);
    }

    this._setHighlightedCompetitor(winner);

    this.status = `Generation ${this.optimizerManager.getGenerationCount()}`;
    this.lastWinnerShots = winnerShots;
    this.lastWinnerHits = winnerHits;

    this._recordEvent(
      `${winner?.id ?? "Unknown"} leads generation ${this.optimizerManager.getActiveAlgorithm()}`,
    );

    this._updateOverlay();
  }

  _syncCompetitorsToPopulation() {
    const population = this.optimizerManager.getPopulation();
    for (let i = 0; i < this.competitors.length; i++) {
      const competitor = this.competitors[i];
      competitor.genome = population[i % population.length];
    }
  }

  _determineBestCompetitor() {
    return this.competitors.reduce((best, comp) => {
      if (!best || comp.fitness > best.fitness) return comp;
      return best;
    }, null);
  }

  _fitnessForIndex(index) {
    const competitor = this.competitors[index];
    return competitor?.fitness ?? 0;
  }

  _resetCompetitor(competitor) {
    competitor.zoneTime = 0;
    competitor.fitness = 0;
    competitor.shots = 0;
    competitor.hits = 0;
    competitor.body.velocity.set(0, 0, 0);
    competitor.body.angularVelocity.set(0, 0, 0);
    competitor.body.force.set(0, 0, 0);
    competitor.body.torque.set(0, 0, 0);
    competitor.body.rotation.identity();
    if (competitor.baseScale) {
      competitor.body.scale.copy(competitor.baseScale);
    }
    competitor.body.position.copy(this._spawnPosition(Number(competitor.id.split("-")[1]) || 0));
    competitor.body.position.y = this.combatHeight;
    this.agentFactory.refreshFireCooldown(competitor);
  }

  decodeGenome(vector) {
    return {
      angle: vector[0],
      speed: vector[1],
      lifetime: vector[2],
      spread: vector[3],
      size: vector[4],
    };
  }

  _updateOverlay() {
    const overlayState = {
      generation: this.optimizerManager.getGenerationCount(),
      bestFitness: this.bestFitness,
      topAgentId: this.bestAgentId,
      zoneTime: this.bestZoneTime,
      status: this.status,
      bestTeamName: this.bestTeamName,
    };

    if (this.currentTelemetry) {
      overlayState.telemetry = this.currentTelemetry;
    }

    this.trainingOverlay?.update(overlayState);

    this.progressOverlay?.updateHistory(this.history);
  }

  _recordEvent(text) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `${timestamp} · ${text}`;
    this.eventLog.unshift(entry);
    if (this.eventLog.length > 8) this.eventLog.pop();
    this.trainingOverlay?.addEventLog(entry);
  }

  _fireBullet(competitor) {
    if (this.bullets.length >= this.maxBullets) return;

    const target = this._selectTarget(competitor);
    if (!target) return;

    if (competitor.energy < competitor.energyCost) return;
    competitor.energy -= competitor.energyCost;

    const spawn = competitor.body.position.clone();
    spawn.y += 0.6;

    const direction = Vec3.sub(this._getTargetPosition(target), spawn).normalize();

    const bullet = new RigidBody({
      mass: 0.2,
      position: spawn,
    });

    bullet.useGravity = false;
    bullet.scale = new Vec3(0.25, 0.25, 0.25);

    const collider = new SphereCollider(0.18);
    collider.attach(bullet);

    bullet.velocity.copy(direction.clone().scale(this.bulletSpeed));
    const team = competitor.team ?? 0;
    const color = TEAM_BULLET_COLORS[team % TEAM_BULLET_COLORS.length];
    bullet.color = color.clone();

    this.physicsWorld.addBody(bullet);

    this.bullets.push({
      body: bullet,
      ttl: this.bulletTTL,
      owner: competitor,
    });

    competitor.shots++;
    this._recordEvent(`${competitor.id} fired at ${target.id}`);
  }

  _selectTarget(shooter) {
    const candidates = this.competitors.filter((comp) => comp !== shooter);
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.zoneTime - a.zoneTime);
    return candidates[0];
  }

  _handleBulletHit(record, target, index) {
    const owner = record.owner;

    target.zoneTime = Math.max(0, target.zoneTime - 0.4);
    target.body.applyImpulse(
      Vec3.sub(target.body.position, record.body.position)
        .normalize()
        .scale(4),
    );

    owner.hits++;
    owner.fitness += 0.35;
    this._recordEvent(`${owner.id} hit ${target.id}`);

    this._removeBullet(record, index);
  }

  _removeBullet(record, index) {
    this.physicsWorld.removeBody(record.body);
    this.bullets.splice(index, 1);
  }

  _applyBulletAvoidance(competitor) {
    let threat = null;
    let closestDist = Infinity;

    for (const record of this.bullets) {
      if (record.owner === competitor) continue;

      const distance = record.body.position.distanceTo(competitor.body.position);

      if (distance < this.avoidDistance && distance < closestDist) {
        closestDist = distance;
        threat = record;
      }
    }

    if (!threat) return false;

    const away = Vec3.sub(competitor.body.position, threat.body.position).normalize();
    competitor.body.applyForce(away.scale(30));

    const cover = this._closestObstacle(competitor.body.position);
    if (cover) {
      const toCover = Vec3.sub(cover.position, competitor.body.position).normalize();
      competitor.body.applyForce(toCover.scale(18));
    }

    this._recordEvent(`${competitor.id} dodges ${threat.owner.id}`);
    return true;
  }

  _closestObstacle(position) {
    if (this.obstacles.length === 0) return null;

    let best = null;
    let bestDist = Infinity;

    for (const obstacle of this.obstacles) {
      const d = position.distanceTo(obstacle.position);
      if (d < bestDist) {
        bestDist = d;
        best = obstacle;
      }
    }

    return best;
  }

  _updateObstacles(dt) {
    this._obstaclePhase += dt;
    this.obstacles.forEach((obstacle, index) => {
      const profile = this.obstacleProfiles[index] ?? {};
      const phase = this._obstaclePhase * (profile.speed ?? 0.5) + (profile.phaseOffset ?? 0);
      const radius = (profile.radiusBase ?? this.captureRadius + 1) + Math.sin(phase) * 0.45;
      obstacle.position.x = this.captureCenter.x + Math.cos(phase) * radius;
      obstacle.position.z = this.captureCenter.z + Math.sin(phase) * radius;
      obstacle.position.y =
        this.combatHeight + Math.sin(phase * 1.4) * (profile.heightVariance ?? 0.35);
      const scale = profile.scale ?? 1.2;
      obstacle.scale.set(scale, scale, scale);
    });
  }

  _spawnPosition(index) {
    const angle = (index / this.optimizerManager.populationSize) * Math.PI * 2;
    const radius = this.arenaManager.spawnRadius();
    const center = this.arenaManager.getCaptureCenter();

    return new Vec3(
      center.x + Math.cos(angle) * radius,
      this.combatHeight,
      center.z + Math.sin(angle) * radius,
    );
  }

  _collectTeamStats() {
    const stats = this.teamNames.map(() => ({
      zoneTime: 0,
      shots: 0,
      hits: 0,
      fitness: 0,
    }));

    for (const competitor of this.competitors) {
      const team = stats[competitor.team] ?? stats[0];
      team.zoneTime += competitor.zoneTime;
      team.shots += competitor.shots;
      team.hits += competitor.hits;
      team.fitness = Math.max(team.fitness, competitor.fitness);
    }

    this.progressOverlay?.updateTeamStats(stats);
    this.progressOverlay?.updateHistory(this.history);
  }

  _teamBestFitnessSnapshot() {
    const snapshot = this.teamNames.map(() => 0);

    for (const competitor of this.competitors) {
      const team = Math.min(
        Math.max(0, competitor.team ?? 0),
        this.teamNames.length - 1,
      );
      snapshot[team] = Math.max(snapshot[team], competitor.fitness);
    }

    return snapshot;
  }

  _pushHistoryEntry(teamFitness, bestTeamIndex, bestFitness) {
    const entry = {
      generation: this.optimizerManager.getGenerationCount(),
      teamFitness: Array.isArray(teamFitness) ? teamFitness.slice() : [],
      bestTeamIndex,
      bestFitness,
    };
    this.history.push(entry);
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }

  _setHighlightedCompetitor(competitor) {
    if (this.highlightedCompetitor && this.highlightedCompetitor !== competitor) {
      this.highlightedCompetitor.body.scale.copy(
        this.highlightedCompetitor.baseScale ?? new Vec3(0.4, 0.4, 0.4),
      );
    }

    this.highlightedCompetitor = competitor;

    if (competitor) {
      competitor.body.scale.copy(
        competitor.highlightScale ?? new Vec3(0.7, 0.7, 0.7),
      );
    }
  }

  _updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const record = this.bullets[i];
      record.ttl -= dt;

      if (record.ttl <= 0) {
        this._removeBullet(record, i);
        continue;
      }

      for (const competitor of this.competitors) {
        if (competitor === record.owner) continue;

        const distance = record.body.position.distanceTo(competitor.body.position);
        const threshold =
          record.body.collider.boundingRadius +
          competitor.body.collider.boundingRadius +
          0.1;

        if (distance <= threshold) {
          this._handleBulletHit(record, competitor, i);
          break;
        }
      }
    }
  }

  _refreshParameterUI() {
    const params = this.optimizerManager.getParams();
    Object.entries(params).forEach(([name, value]) => {
      this.trainingOverlay?.updateParameterValue(name, value);
    });
    this.trainingOverlay?.updateParameterValue("bulletSpeed", this.bulletSpeed);
    this.trainingOverlay?.updateParameterValue("avoidDistance", this.avoidDistance);
    this.trainingOverlay?.updateParameterValue("evaluationInterval", this.evaluationInterval);
  }
}
