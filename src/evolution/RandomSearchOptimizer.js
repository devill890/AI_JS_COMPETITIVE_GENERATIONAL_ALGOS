// ======================================
// RandomSearchOptimizer.js
// Simple random search across genomes
// ======================================

import { geneRanges as defaultGeneRanges } from "./geneRanges.js";

export class RandomSearchOptimizer {
  constructor(options = {}) {
    this.populationSize = options.populationSize ?? 10;
    this.geneRanges = options.geneRanges ?? defaultGeneRanges;
    this.explorationRate = options.explorationRate ?? 1;

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
    this.population = this.population.map(() => ({
      vector: this._randomVector(),
      fitness: 0,
    }));
  }

  getBestGenome() {
    return this.population[0];
  }

  updateParams(params = {}) {
    if (params.explorationRate !== undefined) {
      this.explorationRate = Math.max(0, params.explorationRate);
    }
  }

  getParams() {
    return {
      explorationRate: this.explorationRate,
    };
  }
}
