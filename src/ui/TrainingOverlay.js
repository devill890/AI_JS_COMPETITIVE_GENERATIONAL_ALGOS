// ======================================
// TrainingOverlay.js
// Control panel with optimizer options, telemetry hooks, and event log
// ======================================

export class TrainingOverlay {
  constructor(root = document.getElementById("training-overlay")) {
    this.root = root;
    if (!this.root) {
      throw new Error("TrainingOverlay requires a root container");
    }

    this.panel = document.createElement("div");
    this.panel.className = "overlay-panel";
    this.panel.innerHTML = `
      <div class="panel-title">Training Visualizer</div>
      <div class="training-row">
        <span>Generation:</span>
        <span id="training-generation">0</span>
      </div>
      <div class="training-row">
        <span>Best Fitness:</span>
        <span id="training-best">0.00</span>
      </div>
      <div class="training-row">
        <span>Top Agent:</span>
        <span id="training-agent">—</span>
      </div>
      <div id="training-actions">
        <button id="pause-toggle" type="button">Pause</button>
      </div>
      <div id="algorithm-control" class="training-row">
        <span>Optimizer:</span>
        <select id="algorithm-select"></select>
      </div>
      <div class="parameter-row">
        <span>Mutation</span>
        <input type="range" id="param-mutation" min="0" max="0.6" step="0.01" value="0.2" data-param="mutationRate">
        <span class="param-value" id="param-mutation-value">0.20</span>
      </div>
      <div class="parameter-row">
        <span>Temperature</span>
        <input type="range" id="param-temperature" min="0.05" max="1" step="0.01" value="0.8" data-param="temperature">
        <span class="param-value" id="param-temperature-value">0.80</span>
      </div>
      <div class="parameter-row">
        <span>Bullet Speed</span>
        <input type="range" id="param-bulletspeed" min="10" max="35" step="1" value="22" data-param="bulletSpeed">
        <span class="param-value" id="param-bulletspeed-value">22</span>
      </div>
      <div class="parameter-row">
        <span>Avoid Radius</span>
        <input type="range" id="param-avoid" min="1" max="5" step="0.1" value="2.6" data-param="avoidDistance">
        <span class="param-value" id="param-avoid-value">2.60</span>
      </div>
      <div class="parameter-row">
        <span>Eval Interval</span>
        <input type="range" id="param-interval" min="5" max="20" step="0.5" value="10" data-param="evaluationInterval">
        <span class="param-value" id="param-interval-value">10</span>
      </div>
      <div class="parameter-row">
        <span>DE Mutation</span>
        <input type="range" id="param-mutation-factor" min="0.1" max="1" step="0.01" value="0.72" data-param="mutationFactor">
        <span class="param-value" id="param-mutation-factor-value">0.72</span>
      </div>
      <div class="parameter-row">
        <span>DE Crossover</span>
        <input type="range" id="param-crossover" min="0" max="1" step="0.01" value="0.65" data-param="crossoverRate">
        <span class="param-value" id="param-crossover-value">0.65</span>
      </div>
      <div class="parameter-row">
        <span>PSO Inertia</span>
        <input type="range" id="param-inertia" min="0.1" max="1" step="0.01" value="0.55" data-param="inertia">
        <span class="param-value" id="param-inertia-value">0.55</span>
      </div>
      <div class="parameter-row">
        <span>PSO Cognitive</span>
        <input type="range" id="param-cognitive" min="0.1" max="2" step="0.05" value="1.2" data-param="cognitive">
        <span class="param-value" id="param-cognitive-value">1.20</span>
      </div>
      <div class="parameter-row">
        <span>PSO Social</span>
        <input type="range" id="param-social" min="0.1" max="2" step="0.05" value="1.2" data-param="social">
        <span class="param-value" id="param-social-value">1.20</span>
      </div>
      <div class="training-row">
        <span>Status:</span>
        <span id="training-status">Initializing</span>
      </div>
      <div id="telemetry-panel" class="telemetry-panel">
        <div class="panel-title">Telemetry</div>
        <div class="telemetry-row">
          <span>Generation</span>
          <span id="telemetry-generation">—</span>
        </div>
        <div class="telemetry-row">
          <span>Best Fitness</span>
          <span id="telemetry-best-fitness">—</span>
        </div>
        <div class="telemetry-row">
          <span>Best Team</span>
          <span id="telemetry-best-team">—</span>
        </div>
        <div class="telemetry-row">
          <span>Zone Time</span>
          <span id="telemetry-zone-time">—</span>
        </div>
        <div class="telemetry-row">
          <span>Shots</span>
          <span id="telemetry-shots">—</span>
        </div>
        <div class="telemetry-row">
          <span>Hits</span>
          <span id="telemetry-hits">—</span>
        </div>
        <div class="telemetry-row">
          <span>Optimizer</span>
          <span id="telemetry-optimizer">—</span>
        </div>
        <div class="training-row telemetry-actions">
          <button id="telemetry-export" type="button">Download Log</button>
        </div>
      </div>
      <div id="event-log">
        <div class="event-title">Event Log</div>
        <ul id="event-list"></ul>
      </div>
    `;

    this.root.appendChild(this.panel);

    this.generation = this.panel.querySelector("#training-generation");
    this.best = this.panel.querySelector("#training-best");
    this.agent = this.panel.querySelector("#training-agent");
    this.status = this.panel.querySelector("#training-status");
    this.algorithmSelect = this.panel.querySelector("#algorithm-select");
    this.pauseToggle = this.panel.querySelector("#pause-toggle");
    this.telemetryExportButton = this.panel.querySelector("#telemetry-export");
    this.telemetryNodes = {
      generation: this.panel.querySelector("#telemetry-generation"),
      bestFitness: this.panel.querySelector("#telemetry-best-fitness"),
      bestTeam: this.panel.querySelector("#telemetry-best-team"),
      zoneTime: this.panel.querySelector("#telemetry-zone-time"),
      shots: this.panel.querySelector("#telemetry-shots"),
      hits: this.panel.querySelector("#telemetry-hits"),
      optimizer: this.panel.querySelector("#telemetry-optimizer"),
    };

    this.parameterControls = Array.from(
      this.panel.querySelectorAll(".parameter-row input"),
    ).map((input) => ({
      name: input.dataset.param,
      input,
      valueNode: this.panel.querySelector(`#${input.id}-value`),
    }));

    this.parameterControls.forEach((control) => {
      control.input.addEventListener("input", () => {
        control.valueNode.textContent = parseFloat(control.input.value).toFixed(2);
        this.onParameterChange?.(control.name, parseFloat(control.input.value));
      });
    });

    this.algorithmSelect.addEventListener("change", (event) => {
      this.onAlgorithmChange?.(event.target.value);
    });

    this.pauseToggle.addEventListener("click", () => {
      const isPaused = this.pauseToggle.dataset.paused === "true";
      this.pauseToggle.dataset.paused = (!isPaused).toString();
      this.pauseToggle.textContent = isPaused ? "Pause" : "Resume";
      this.onPauseToggle?.(!isPaused);
    });

    this.telemetryExportButton?.addEventListener("click", () => {
      this.onTelemetryExport?.();
    });

    this.updateTelemetry();
  }

  bindAlgorithmChange(handler) {
    this.onAlgorithmChange = handler;
  }

  bindParameterChange(handler) {
    this.onParameterChange = handler;
  }

  bindPauseToggle(handler) {
    this.onPauseToggle = handler;
  }

  bindTelemetryExport(handler) {
    this.onTelemetryExport = handler;
  }

  setAlgorithmOptions(options = [], active) {
    this.algorithmSelect.innerHTML = options
      .map(
        (option) =>
          `<option value="${option.value}" ${
            option.value === active ? "selected" : ""
          }>${option.label}</option>`,
      )
      .join("");
  }

  updateParameterValue(name, value) {
    const control = this.parameterControls.find((c) => c.name === name);
    if (!control) return;
    control.input.value = value;
    control.valueNode.textContent = parseFloat(value).toFixed(2);
  }

  addEventLog(entry) {
    if (!entry) return;
    const li = document.createElement("li");
    li.textContent = entry;
    const list = this.panel.querySelector("#event-list");
    list.prepend(li);
    while (list.childNodes.length > 6) {
      list.removeChild(list.lastChild);
    }
  }

  setPauseState(paused) {
    if (!this.pauseToggle) return;
    this.pauseToggle.dataset.paused = paused.toString();
    this.pauseToggle.textContent = paused ? "Resume" : "Pause";
  }

  update(events = {}) {
    if (events.generation !== undefined) {
      this.generation.textContent = events.generation;
    }
    if (events.bestFitness !== undefined) {
      const bestValue =
        typeof events.bestFitness === "number"
          ? events.bestFitness.toFixed(2)
          : events.bestFitness;
      const teamLabel = events.bestTeamName ? ` (${events.bestTeamName})` : "";
      this.best.textContent = `${bestValue}${teamLabel}`;
    }
    if (events.topAgentId !== undefined) {
      this.agent.textContent = events.topAgentId;
    }
    if (events.status !== undefined) {
      this.status.textContent = events.status;
    }
    if (events.telemetry) {
      this.updateTelemetry(events.telemetry);
    }
  }

  updateTelemetry(entry = {}) {
    const stats = entry ?? {};
    const nodes =
      this.telemetryNodes ??
      {
        generation: this.panel.querySelector("#telemetry-generation"),
        bestFitness: this.panel.querySelector("#telemetry-best-fitness"),
        bestTeam: this.panel.querySelector("#telemetry-best-team"),
        zoneTime: this.panel.querySelector("#telemetry-zone-time"),
        shots: this.panel.querySelector("#telemetry-shots"),
        hits: this.panel.querySelector("#telemetry-hits"),
        optimizer: this.panel.querySelector("#telemetry-optimizer"),
      };

    if (!nodes || !nodes.generation) {
      return;
    }

    this.telemetryNodes = nodes;

    const write = (target, value) => {
      if (!target) return;
      target.textContent = value;
    };

    write(
      nodes.generation,
      stats.generation ?? nodes.generation.textContent ?? "—",
    );
    write(
      nodes.bestFitness,
      stats.bestFitness !== undefined
        ? typeof stats.bestFitness === "number"
          ? stats.bestFitness.toFixed(2)
          : stats.bestFitness
        : "—",
    );
    write(nodes.bestTeam, stats.bestTeam ?? "—");
    write(
      nodes.zoneTime,
      stats.zoneTime !== undefined ? stats.zoneTime.toFixed(2) : "—",
    );
    write(nodes.shots, stats.shots ?? "—");
    write(nodes.hits, stats.hits ?? "—");
    write(nodes.optimizer, stats.optimizer ?? "—");
  }
}
