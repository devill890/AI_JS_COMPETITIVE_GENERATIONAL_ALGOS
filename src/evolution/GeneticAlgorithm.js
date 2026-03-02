// ======================================
// GeneticAlgorithm.js
// Simple evolution helper (Genetic strategy)
// ======================================

import { geneRanges as defaultGeneRanges } from "./geneRanges.js";

export class GeneticAlgorithm {
  constructor(options = {}) {
    this.populationSize = options.populationSize ?? 6;
    this.mutationRate = options.mutationRate ?? 0.2;
    this.geneRanges = options.geneRanges ?? defaultGeneRanges;

    this.generations = 0;
    this.population = [];

    this._initPopulation();
  }

  _initPopulation() {
    this.population = [];
    for (let i = 0; i < this.populationSize; i++) {
      this.population.push({
        vector: this.geneRanges.map((range) => this._randomGene(range)),
        fitness: 0,
      });
    }
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

    const elites = this.population.slice(0, 2);
    const next = elites.map((genome) => ({
      vector: genome.vector.slice(),
      fitness: genome.fitness,
    }));

    while (next.length < this.populationSize) {
      const parentA = this._select();
      const parentB = this._select();

      const childVector = this._crossover(parentA.vector, parentB.vector);
      const mutatedVector = this._mutate(childVector);

      next.push({ vector: mutatedVector, fitness: 0 });
    }

    this.population = next;
    this.generations++;
  }

  getBestGenome() {
    return this.population[0];
  }

  updateParams(params = {}) {
    if (params.mutationRate !== undefined) {
      this.mutationRate = Math.max(0.0, Math.min(1, params.mutationRate));
    }
  }

  getParams() {
    return {
      mutationRate: this.mutationRate,
    };
  }

  _select() {
    const totalFitness = this.population.reduce(
      (sum, genome) => sum + Math.max(0, genome.fitness),
      0,
    );

    if (totalFitness === 0) {
      return this.population[
        Math.floor(Math.random() * this.population.length)
      ];
    }

    let cursor = Math.random() * totalFitness;

    for (const genome of this.population) {
      cursor -= Math.max(0, genome.fitness);
      if (cursor <= 0) {
        return genome;
      }
    }

    return this.population[this.population.length - 1];
  }

  _crossover(a, b) {
    const child = [];
    for (let i = 0; i < a.length; i++) {
      child[i] = Math.random() < 0.5 ? a[i] : b[i];
    }
    return child;
  }

  _mutate(vector) {
    return vector.map((gene, index) => {
      if (Math.random() >= this.mutationRate) return gene;
      return this._randomGene(this.geneRanges[index]);
    });
  }
}
