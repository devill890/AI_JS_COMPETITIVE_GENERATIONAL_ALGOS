// ======================================
// TeamProgressOverlay.js
// Displays team stats and fitness history in its own overlay
// ======================================

export class TeamProgressOverlay {
  constructor(root = document.getElementById("team-progress-overlay")) {
    this.root = root;
    if (!this.root) {
      throw new Error("TeamProgressOverlay requires a root container");
    }

    this.panel = document.createElement("div");
    this.panel.className = "overlay-panel progress-panel";
    this.panel.innerHTML = `
      <div class="panel-title">Team Progress</div>
      <canvas id="progress-chart" width="240" height="130"></canvas>
      <div class="graph-legend" id="graph-legend"></div>
      <div id="team-stats-panel">
        <div class="team-block" data-team="0">
          <div class="team-label">Team Red</div>
          <div class="team-row">
            <span>Zone:</span>
            <span id="team-0-zone">0.0s</span>
          </div>
          <div class="team-row">
            <span>Shots:</span>
            <span id="team-0-shots">0</span>
          </div>
          <div class="team-row">
            <span>Hits:</span>
            <span id="team-0-hits">0</span>
          </div>
          <div class="team-row">
            <span>Fitness:</span>
            <span id="team-0-fitness">0.00</span>
          </div>
        </div>
        <div class="team-block" data-team="1">
          <div class="team-label">Team Blue</div>
          <div class="team-row">
            <span>Zone:</span>
            <span id="team-1-zone">0.0s</span>
          </div>
          <div class="team-row">
            <span>Shots:</span>
            <span id="team-1-shots">0</span>
          </div>
          <div class="team-row">
            <span>Hits:</span>
            <span id="team-1-hits">0</span>
          </div>
          <div class="team-row">
            <span>Fitness:</span>
            <span id="team-1-fitness">0.00</span>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(this.panel);

    this.graphCanvas = this.panel.querySelector("#progress-chart");
    this.graphCtx = this.graphCanvas?.getContext("2d");
    this.graphLegend = this.panel.querySelector("#graph-legend");
    this.teamNodes = [
      {
        zone: this.panel.querySelector("#team-0-zone"),
        shots: this.panel.querySelector("#team-0-shots"),
        hits: this.panel.querySelector("#team-0-hits"),
        fitness: this.panel.querySelector("#team-0-fitness"),
      },
      {
        zone: this.panel.querySelector("#team-1-zone"),
        shots: this.panel.querySelector("#team-1-shots"),
        hits: this.panel.querySelector("#team-1-hits"),
        fitness: this.panel.querySelector("#team-1-fitness"),
      },
    ];

    this.graphHistory = [];
    this.graphTeamNames = [];
    this.graphColors = ["#ff6b6b", "#5fa2ff", "#f0c330"];
    this.historyLimit = 48;
  }

  setTeamNames(names = []) {
    this.graphTeamNames = Array.isArray(names) ? names.slice() : [];
    this._renderLegend();
  }

  updateTeamStats(stats = []) {
    stats.forEach((teamStat, index) => {
      const node = this.teamNodes[index];
      if (!node) return;
      node.zone.textContent = `${teamStat.zoneTime.toFixed(1)}s`;
      node.shots.textContent = teamStat.shots;
      node.hits.textContent = teamStat.hits;
      node.fitness.textContent = teamStat.fitness.toFixed(2);
    });
  }

  updateHistory(history = []) {
    if (!Array.isArray(history)) return;
    this.graphHistory = history.slice(-this.historyLimit);
    this._renderLegend();
    this._drawHistory();
  }

  _renderLegend() {
    if (!this.graphLegend) return;
    if (!this.graphTeamNames.length) {
      this.graphLegend.innerHTML = "";
      return;
    }
    this.graphLegend.innerHTML = this.graphTeamNames
      .map(
        (name, index) => `
          <span>
            <span class="graph-dot" style="background:${this.graphColors[
              index % this.graphColors.length
            ]}"></span>
            ${name}
          </span>
        `,
      )
      .join("");
  }

  _drawHistory() {
    if (!this.graphCtx || !this.graphCanvas) return;
    const ctx = this.graphCtx;
    const width = this.graphCanvas.width;
    const height = this.graphCanvas.height;
    ctx.clearRect(0, 0, width, height);

    if (this.graphHistory.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "12px monospace";
      ctx.fillText("Waiting for generations…", 14, height / 2);
      return;
    }

    const stats = this.graphHistory.flatMap((entry) => entry.teamFitness ?? []);
    const maxValue = Math.max(1, ...stats);
    const padding = 10;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    const len = this.graphHistory.length;
    const stepX = len > 1 ? plotWidth / (len - 1) : plotWidth;
    const baseline = height - padding;

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, baseline);
    ctx.lineTo(width - padding, baseline);
    ctx.stroke();

    const teamCount =
      this.graphHistory[0]?.teamFitness?.length ?? this.graphTeamNames.length;

    for (let teamIndex = 0; teamIndex < teamCount; teamIndex++) {
      ctx.beginPath();
      ctx.strokeStyle = this.graphColors[teamIndex % this.graphColors.length];
      ctx.lineWidth = 2;
      ctx.fillStyle = ctx.strokeStyle;

      this.graphHistory.forEach((entry, entryIndex) => {
        const fitnessValues = entry.teamFitness ?? [];
        const value = fitnessValues[teamIndex] ?? 0;
        const normalized = Math.min(1, value / maxValue);
        const x = padding + stepX * entryIndex;
        const y = baseline - normalized * plotHeight;

        if (entryIndex === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      this.graphHistory.forEach((entry, entryIndex) => {
        const fitnessValues = entry.teamFitness ?? [];
        const value = fitnessValues[teamIndex] ?? 0;
        const normalized = Math.min(1, value / maxValue);
        const x = padding + stepX * entryIndex;
        const y = baseline - normalized * plotHeight;

        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}
