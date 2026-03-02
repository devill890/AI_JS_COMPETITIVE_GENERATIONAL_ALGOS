// ======================================
// OptimizerManager.js
// Switchable optimizer controller
// ======================================

import { GeneticAlgorithm } from "./GeneticAlgorithm.js";
import { SimulatedAnnealingOptimizer } from "./SimulatedAnnealingOptimizer.js";
import { RandomSearchOptimizer } from "./RandomSearchOptimizer.js";
import { DifferentialEvolutionOptimizer } from "./DifferentialEvolutionOptimizer.js";
import { ParticleSwarmOptimizer } from "./ParticleSwarmOptimizer.js";

export class OptimizerManager {
  constructor(options = {}) {
    this.populationSize = options.populationSize ?? 8;
    this.geneRanges = options.geneRanges;
    this.params = options.params ?? {};

    this.algorithmOptions = [
      { value: "genetic", label: "Genetic Evolution" },
      { value: "differential", label: "Differential Evolution" },
      { value: "swarm", label: "Particle Swarm" },
      { value: "annealing", label: "Simulated Annealing" },
      { value: "random", label: "Random Search" },
    ];

    this._factories = {
      genetic: (opts) => new GeneticAlgorithm(opts),
      differential: (opts) => new DifferentialEvolutionOptimizer(opts),
      swarm: (opts) => new ParticleSwarmOptimizer(opts),
      annealing: (opts) => new SimulatedAnnealingOptimizer(opts),
      random: (opts) => new RandomSearchOptimizer(opts),
    };

    this.setAlgorithm(options.algorithm ?? "genetic");
  }

  setAlgorithm(name) {
    const factory = this._factories[name];
    if (!factory) return false;

    this.currentAlgorithm = name;

    this.optimizer = factory({
      populationSize: this.populationSize,
      geneRanges: this.geneRanges,
      ...this.params,
    });

    return true;
  }

  evaluate(fitnessFn) {
    this.optimizer.evaluate(fitnessFn);
  }

  nextGeneration() {
    this.optimizer.nextGeneration();
  }

  getPopulation() {
    return this.optimizer.population;
  }

  getBestGenome() {
    return this.optimizer.getBestGenome();
  }

  updateParams(params = {}) {
    this.params = { ...this.params, ...params };
    this.optimizer.updateParams?.(params);
  }

  getParams() {
    return this.optimizer.getParams?.() ?? {};
  }

  getAlgorithmOptions() {
    return this.algorithmOptions;
  }

  getActiveAlgorithm() {
    return this.currentAlgorithm;
  }

  getGenerationCount() {
    return this.optimizer?.generations ?? 0;
  }
}
