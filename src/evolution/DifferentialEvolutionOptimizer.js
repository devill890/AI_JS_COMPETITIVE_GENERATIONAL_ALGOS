// ======================================
// DifferentialEvolutionOptimizer.js
// Population-based optimizer using differential updates
// ======================================

import { geneRanges as defaultGeneRanges } from "./geneRanges.js";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export class DifferentialEvolutionOptimizer {
  constructor(options = {}) {
    this.populationSize = options.populationSize ?? 10;
    this.geneRanges = options.geneRanges ?? defaultGeneRanges;
    this.mutationFactor = options.mutationFactor ?? 0.72;
    this.crossoverRate = options.crossoverRate ?? 0.65;
    this.generations = 0;

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

    const next = [];
    for (let i = 0; i < this.population.length; i++) {
      const target = this.population[i];
      const [a, b, c] = this._selectThree(i);

      const mutant = this._mutateVector(a.vector, b.vector, c.vector);
      const trial = this._crossover(target.vector, mutant);

      next.push({ vector: trial, fitness: 0 });
    }

    this.population = next;
    this.generations++;
  }

  getBestGenome() {
    return this.population[0];
  }

  updateParams(params = {}) {
    if (params.mutationFactor !== undefined) {
      this.mutationFactor = clamp(params.mutationFactor, 0.1, 1);
    }

    if (params.crossoverRate !== undefined) {
      this.crossoverRate = clamp(params.crossoverRate, 0, 1);
    }
  }

  getParams() {
    return {
      mutationFactor: this.mutationFactor,
      crossoverRate: this.crossoverRate,
    };
  }

  _selectThree(excludeIndex) {
    const indices = [];
    while (indices.length < 3) {
      const candidate = Math.floor(Math.random() * this.population.length);
      if (candidate === excludeIndex || indices.includes(candidate)) continue;
      indices.push(candidate);
    }
    return indices.map((index) => this.population[index]);
  }

  _mutateVector(a, b, c) {
    return a.map((value, index) => {
      const range = this.geneRanges[index];
      const mutated =
        value + this.mutationFactor * (b[index] - c[index]);
      return clamp(mutated, range.min, range.max);
    });
  }

  _crossover(target, mutant) {
    const trial = target.slice();
    const pivot = Math.floor(Math.random() * target.length);

    for (let i = 0; i < target.length; i++) {
      if (i === pivot || Math.random() < this.crossoverRate) {
        trial[i] = mutant[i];
      }
    }

    return trial;
  }
}
