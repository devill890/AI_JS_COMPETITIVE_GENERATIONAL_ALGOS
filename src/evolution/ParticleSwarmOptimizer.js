// ======================================
// ParticleSwarmOptimizer.js
// Velocity-driven swarm search with inertia and cognitive/social influence
// ======================================

import { geneRanges as defaultGeneRanges } from "./geneRanges.js";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export class ParticleSwarmOptimizer {
  constructor(options = {}) {
    this.populationSize = options.populationSize ?? 8;
    this.geneRanges = options.geneRanges ?? defaultGeneRanges;
    this.inertia = options.inertia ?? 0.55;
    this.cognitive = options.cognitive ?? 1.2;
    this.social = options.social ?? 1.2;

    this.generations = 0;
    this.globalBestFitness = -Infinity;
    this.globalBestVector = null;

    this.population = [];
    this._initPopulation();
  }

  _initPopulation() {
    this.population = [];
    for (let i = 0; i < this.populationSize; i++) {
      const vector = this._randomVector();
      this.population.push({
        vector,
        velocity: vector.map(() => 0),
        fitness: 0,
        personalBestVector: vector.slice(),
        personalBestFitness: -Infinity,
      });
    }
  }

  _randomVector() {
    return this.geneRanges.map((range) => this._randomGene(range));
  }

  _randomGene(range) {
    return Math.random() * (range.max - range.min) + range.min;
  }

  evaluate(fitnessFn) {
    if (typeof fitnessFn !== "function") return;

    for (const particle of this.population) {
      particle.fitness = fitnessFn(particle.vector, 0, particle) ?? 0;

      if (particle.fitness > particle.personalBestFitness) {
        particle.personalBestFitness = particle.fitness;
        particle.personalBestVector = particle.vector.slice();
      }

      if (particle.fitness > this.globalBestFitness) {
        this.globalBestFitness = particle.fitness;
        this.globalBestVector = particle.vector.slice();
      }
    }

    this.population.sort((a, b) => b.fitness - a.fitness);
  }

  nextGeneration() {
    if (this.population.length === 0) return;

    const globalVector =
      this.globalBestVector ?? this.population[0].vector;

    for (const particle of this.population) {
      for (let i = 0; i < particle.vector.length; i++) {
        const range = this.geneRanges[i];
        const personalDelta =
          particle.personalBestVector[i] - particle.vector[i];
        const globalDelta = globalVector[i] - particle.vector[i];

        const r1 = Math.random();
        const r2 = Math.random();

        let velocity =
          particle.velocity[i] * this.inertia +
          this.cognitive * r1 * personalDelta +
          this.social * r2 * globalDelta;

        const span = range.max - range.min;
        const maxVelocity = span * 0.5;
        velocity = clamp(velocity, -maxVelocity, maxVelocity);

        particle.velocity[i] = velocity;
        particle.vector[i] = clamp(
          particle.vector[i] + velocity,
          range.min,
          range.max,
        );
      }
    }

    this.generations++;
  }

  getBestGenome() {
    return this.population[0];
  }

  updateParams(params = {}) {
    if (params.inertia !== undefined) {
      this.inertia = clamp(params.inertia, 0, 1);
    }

    if (params.cognitive !== undefined) {
      this.cognitive = Math.max(0, params.cognitive);
    }

    if (params.social !== undefined) {
      this.social = Math.max(0, params.social);
    }
  }

  getParams() {
    return {
      inertia: this.inertia,
      cognitive: this.cognitive,
      social: this.social,
    };
  }
}
