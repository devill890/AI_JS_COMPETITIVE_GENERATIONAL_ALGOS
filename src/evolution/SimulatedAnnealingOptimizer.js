// ======================================
// SimulatedAnnealingOptimizer.js
// Local search with cooling schedule
// ======================================

import { geneRanges as defaultGeneRanges } from "./geneRanges.js";

export class SimulatedAnnealingOptimizer {
  constructor(options = {}) {
    this.populationSize = options.populationSize ?? 10;
    this.geneRanges = options.geneRanges ?? defaultGeneRanges;
    this.temperature = options.temperature ?? 0.9;
    this.decay = options.decay ?? 0.02;
    this.minTemperature = options.minTemperature ?? 0.05;

    this.population = [];
    this._initPopulation();
  }

  _initPopulation() {
    this.population = [];
    for (let i = 0; i < this.populationSize; i++) {
      this.population.push({
        vector: this._randomVector(),
        fitness: 0,
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

    for (let i = 0; i < this.population.length; i++) {
      const genome = this.population[i];
      genome.fitness = fitnessFn(genome.vector, i, genome) ?? 0;
    }

    this.population.sort((a, b) => b.fitness - a.fitness);
  }

  nextGeneration() {
    if (this.population.length === 0) return;

    const best = this.population[0];
    const next = [];

    for (let i = 0; i < this.populationSize; i++) {
      const source = i === 0 ? best.vector : this.population[i].vector;
      next.push({
        vector: this._mutate(source),
        fitness: 0,
      });
    }

    this.population = next;
    this.temperature = Math.max(
      this.minTemperature,
      this.temperature - this.decay,
    );
  }

  getBestGenome() {
    return this.population[0];
  }

  updateParams(params = {}) {
    if (params.temperature !== undefined) {
      this.temperature = Math.max(this.minTemperature, params.temperature);
    }

    if (params.decay !== undefined) {
      this.decay = Math.max(0, params.decay);
    }
  }

  getParams() {
    return {
      temperature: this.temperature,
      decay: this.decay,
    };
  }

  _mutate(vector) {
    const mutated = [];
    for (let i = 0; i < vector.length; i++) {
      const gene = vector[i];
      const range = this.geneRanges[i];
      const spread = (range.max - range.min) * this.temperature * 0.3;
      const delta = (Math.random() * 2 - 1) * spread;
      const next = Math.max(range.min, Math.min(range.max, gene + delta));
      mutated.push(next);
    }
    return mutated;
  }
}
