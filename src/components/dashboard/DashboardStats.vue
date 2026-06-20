<template>
  <div id="dashboard-stats" class="mb-4">
    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap">
      <h4 class="mb-0">Overview</h4>
      <div class="d-flex align-items-center">
        <b-form-checkbox
          v-model="autoRefresh"
          switch
          size="sm"
          class="mr-3 mb-0"
        >Auto ({{ refreshSeconds }}s)</b-form-checkbox>
        <small v-if="lastUpdated" class="text-muted mr-2">
          updated {{ updatedAgo }}
        </small>
        <b-btn size="sm" variant="outline-secondary" :disabled="loading" @click="load">
          <span v-if="loading">Loading…</span>
          <span v-else>Refresh</span>
        </b-btn>
      </div>
    </div>

    <b-alert :show="error != null" variant="warning">
      Can't load dashboard data: {{ error }}
    </b-alert>

    <atom-spinner
      v-if="loading && !hasData"
      class="spinner"
      :animation-duration="1000"
      :size="60"
      :color="'#007bff'"
    />

    <div v-if="hasData">
      <!-- Summary cards -->
      <div class="card-deck dashboard-deck mb-3">
        <b-card class="text-center" border-variant="success">
          <div class="metric">{{ runningInstances }}</div>
          <div class="metric-label">Running instances</div>
        </b-card>
        <b-card class="text-center" :border-variant="openIncidents > 0 ? 'danger' : 'light'">
          <div class="metric" :class="{ 'text-danger': openIncidents > 0 }">{{ openIncidents }}</div>
          <div class="metric-label">Open incidents</div>
        </b-card>
        <b-card class="text-center" :border-variant="failedJobs > 0 ? 'warning' : 'light'">
          <div class="metric" :class="{ 'text-warning': failedJobs > 0 }">{{ failedJobs }}</div>
          <div class="metric-label">Failed jobs</div>
        </b-card>
        <b-card class="text-center" border-variant="info">
          <div class="metric">{{ definitionsWithIncidents }}</div>
          <div class="metric-label">Defs with incidents</div>
        </b-card>
        <b-card class="text-center" border-variant="primary">
          <div class="metric">{{ startedToday == null ? '—' : startedToday }}</div>
          <div class="metric-label">Started today</div>
        </b-card>
        <b-card class="text-center" border-variant="secondary">
          <div class="metric">{{ deployments == null ? '—' : deployments }}</div>
          <div class="metric-label">Deployments</div>
        </b-card>
      </div>

      <!-- Trend -->
      <b-card class="mb-3" no-body>
        <b-card-body class="py-2">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="mb-0">New incidents · last 7 days</h6>
            <small class="text-muted">
              total {{ trendTotal }} · peak {{ trendMax }}
            </small>
          </div>
          <div v-if="trendError" class="text-muted small">trend unavailable</div>
          <div v-else-if="trend.length" class="trend-wrap">
            <svg class="sparkline" :viewBox="'0 0 ' + svgW + ' ' + svgH" preserveAspectRatio="none">
              <polyline
                class="spark-area"
                :points="areaPoints"
              />
              <polyline
                class="spark-line"
                :points="linePoints"
              />
              <circle
                v-for="(p, i) in points"
                :key="i"
                :cx="p.x"
                :cy="p.y"
                r="2.5"
                class="spark-dot"
              >
                <title>{{ trend[i].label }}: {{ trend[i].count }}</title>
              </circle>
            </svg>
            <div class="d-flex justify-content-between trend-axis">
              <small class="text-muted">{{ trend[0].label }}</small>
              <small class="text-muted">{{ trend[trend.length - 1].label }}</small>
            </div>
          </div>
          <div v-else class="text-muted small">loading…</div>
        </b-card-body>
      </b-card>

      <div class="row">
        <!-- Top processes by incidents -->
        <div class="col-md-8">
          <div class="d-flex justify-content-between align-items-center">
            <h5>Top processes by incidents</h5>
            <b-btn
              size="sm"
              variant="outline-primary"
              :disabled="topProcesses.length === 0"
              @click="exportCsv"
            >Export CSV</b-btn>
          </div>
          <p v-if="topProcesses.length === 0" class="text-muted">No incidents right now 🎉</p>
          <table v-else class="table table-sm table-hover">
            <thead>
              <tr>
                <th>Process</th>
                <th class="text-right">Active</th>
                <th class="text-right">Incidents</th>
                <th style="width: 30%;">Health</th>
              </tr>
            </thead>
            <tbody>
              <tr :key="row.id" v-for="row in topProcesses">
                <td style="word-break: break-all;">
                  <router-link :to="{ name: 'definition', params: { definitionId: row.id } }">
                    {{ row.label }}
                  </router-link>
                </td>
                <td class="text-right">{{ row.instances }}</td>
                <td class="text-right">
                  <b-badge variant="danger">{{ row.incidents }}</b-badge>
                </td>
                <td>
                  <div class="health-bar" :title="healthPercent(row) + '% incident ratio'">
                    <div
                      class="health-bar-fill"
                      :style="{ width: healthPercent(row) + '%' }"
                    ></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Incidents by type -->
        <div class="col-md-4">
          <h5>Incidents by type</h5>
          <p v-if="incidentsByType.length === 0" class="text-muted">—</p>
          <div v-else>
            <div :key="t.type" v-for="t in incidentsByType" class="type-row">
              <div class="d-flex justify-content-between">
                <span class="text-truncate" :title="t.type">{{ t.type }}</span>
                <b-badge variant="secondary">{{ t.count }}</b-badge>
              </div>
              <div class="type-bar">
                <div class="type-bar-fill" :style="{ width: typePercent(t) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { exportToCsv } from "@/utils/csv";

const TOP_LIMIT = 10;
const TREND_DAYS = 7;
const REFRESH_SECONDS = 30;
const CAMUNDA_DATE = "YYYY-MM-DDTHH:mm:ss.SSSZ";

export default {
  name: "DashboardStats",
  data() {
    return {
      loading: false,
      error: null,
      lastUpdated: null,
      nowTick: Date.now(),
      statistics: [],
      runningInstances: 0,
      openIncidents: 0,
      startedToday: null,
      deployments: null,
      trend: [],
      trendError: false,
      autoRefresh: false,
      refreshSeconds: REFRESH_SECONDS,
      refreshTimer: null,
      tickTimer: null,
      svgW: 600,
      svgH: 60
    };
  },
  computed: {
    hasData() {
      return this.lastUpdated != null && this.error == null;
    },
    updatedAgo() {
      // depend on nowTick so the label refreshes over time
      return this.nowTick && this.$momenttrue(this.lastUpdated).fromNow();
    },
    failedJobs() {
      return this.statistics.reduce((sum, s) => sum + (s.failedJobs || 0), 0);
    },
    definitionsWithIncidents() {
      return this.statistics.filter(s => this.incidentCountOf(s) > 0).length;
    },
    topProcesses() {
      return this.statistics
        .map(s => ({
          id: s.id,
          label: this.labelOf(s),
          instances: s.instances || 0,
          incidents: this.incidentCountOf(s)
        }))
        .filter(row => row.incidents > 0)
        .sort((a, b) => b.incidents - a.incidents)
        .slice(0, TOP_LIMIT);
    },
    incidentsByType() {
      const byType = {};
      this.statistics.forEach(s => {
        (s.incidents || []).forEach(inc => {
          byType[inc.incidentType] = (byType[inc.incidentType] || 0) + (inc.incidentCount || 0);
        });
      });
      return Object.keys(byType)
        .map(type => ({ type, count: byType[type] }))
        .sort((a, b) => b.count - a.count);
    },
    typeMax() {
      return this.incidentsByType.reduce((m, t) => Math.max(m, t.count), 0);
    },
    trendMax() {
      return this.trend.reduce((m, t) => Math.max(m, t.count), 0);
    },
    trendTotal() {
      return this.trend.reduce((sum, t) => sum + t.count, 0);
    },
    points() {
      if (!this.trend.length) {
        return [];
      }
      const pad = 6;
      const w = this.svgW - pad * 2;
      const h = this.svgH - pad * 2;
      const max = this.trendMax || 1;
      const step = this.trend.length > 1 ? w / (this.trend.length - 1) : 0;
      return this.trend.map((t, i) => ({
        x: +(pad + step * i).toFixed(1),
        y: +(pad + h - (t.count / max) * h).toFixed(1)
      }));
    },
    linePoints() {
      return this.points.map(p => `${p.x},${p.y}`).join(" ");
    },
    areaPoints() {
      if (!this.points.length) {
        return "";
      }
      const baseline = this.svgH - 6;
      const first = this.points[0];
      const last = this.points[this.points.length - 1];
      return `${first.x},${baseline} ${this.linePoints} ${last.x},${baseline}`;
    }
  },
  methods: {
    incidentCountOf(stat) {
      return (stat.incidents || []).reduce((sum, inc) => sum + (inc.incidentCount || 0), 0);
    },
    labelOf(stat) {
      if (stat.definition) {
        return stat.definition.name || stat.definition.key || stat.id;
      }
      return stat.id;
    },
    healthPercent(row) {
      if (!row.instances) {
        return 100;
      }
      return Math.min(100, Math.round((row.incidents / row.instances) * 100));
    },
    typePercent(t) {
      return this.typeMax ? Math.round((t.count / this.typeMax) * 100) : 0;
    },
    load() {
      this.loading = true;
      this.error = null;
      Promise.all([
        this.$api().get("/process-definition/statistics?failedJobs=true&incidents=true"),
        this.$api().get("/process-instance/count"),
        this.$api().get("/incident/count")
      ])
        .then(([statsRes, runningRes, incidentRes]) => {
          this.statistics = Array.isArray(statsRes.data) ? statsRes.data : [];
          this.runningInstances = (runningRes.data && runningRes.data.count) || 0;
          this.openIncidents = (incidentRes.data && incidentRes.data.count) || 0;
          this.lastUpdated = new Date();
          this.nowTick = Date.now();
        })
        .catch(err => {
          this.error = err && err.message ? err.message : String(err);
        })
        .finally(() => {
          this.loading = false;
        });

      // Secondary widgets load independently so one failure doesn't break the rest.
      this.loadStartedToday();
      this.loadDeployments();
      this.loadTrend();
    },
    loadStartedToday() {
      const after = encodeURIComponent(this.$momenttrue().startOf("day").format(CAMUNDA_DATE));
      this.$api()
        .get("/history/process-instance/count?startedAfter=" + after)
        .then(res => {
          this.startedToday = (res.data && res.data.count) || 0;
        })
        .catch(() => {
          this.startedToday = null;
        });
    },
    loadDeployments() {
      this.$api()
        .get("/deployment/count")
        .then(res => {
          this.deployments = (res.data && res.data.count) || 0;
        })
        .catch(() => {
          this.deployments = null;
        });
    },
    loadTrend() {
      this.trendError = false;
      const requests = [];
      for (let i = TREND_DAYS - 1; i >= 0; i--) {
        const dayStart = this.$momenttrue().startOf("day").subtract(i, "days");
        const dayEnd = dayStart.clone().add(1, "day");
        const after = encodeURIComponent(dayStart.format(CAMUNDA_DATE));
        const before = encodeURIComponent(dayEnd.format(CAMUNDA_DATE));
        requests.push(
          this.$api()
            .get("/history/incident/count?createTimeAfter=" + after + "&createTimeBefore=" + before)
            .then(res => ({
              label: dayStart.format("DD.MM"),
              count: (res.data && res.data.count) || 0
            }))
        );
      }
      Promise.all(requests)
        .then(buckets => {
          this.trend = buckets;
        })
        .catch(() => {
          this.trend = [];
          this.trendError = true;
        });
    },
    exportCsv() {
      const columns = [
        { label: "Process", key: "label" },
        { label: "Definition id", key: "id" },
        { label: "Active instances", key: "instances" },
        { label: "Incidents", key: "incidents" }
      ];
      const stamp = this.$momenttrue().format("YYYY-MM-DD_HH-mm-ss");
      exportToCsv(`top-incident-processes_${stamp}.csv`, columns, this.topProcesses);
    },
    startAutoRefresh() {
      this.stopAutoRefresh();
      this.refreshTimer = setInterval(() => {
        if (!this.loading) {
          this.load();
        }
      }, this.refreshSeconds * 1000);
    },
    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    }
  },
  watch: {
    autoRefresh(on) {
      if (on) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    }
  },
  mounted() {
    this.load();
    // Keep the "updated X ago" label fresh.
    this.tickTimer = setInterval(() => {
      this.nowTick = Date.now();
    }, 15000);
  },
  beforeDestroy() {
    this.stopAutoRefresh();
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
    }
  }
};
</script>

<style scoped>
.dashboard-deck {
  display: flex;
  flex-wrap: wrap;
  margin-right: -8px;
  margin-left: -8px;
}
.dashboard-deck > .card {
  flex: 1 1 150px;
  margin: 8px;
}
.metric {
  font-size: 2.1rem;
  font-weight: 600;
  line-height: 1;
}
.metric-label {
  font-size: 0.75rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.health-bar,
.type-bar {
  background: #e9ecef;
  border-radius: 3px;
  height: 8px;
  overflow: hidden;
}
.health-bar-fill {
  background: linear-gradient(90deg, #ffc107, #dc3545);
  height: 100%;
}
.type-row {
  margin-bottom: 6px;
}
.type-bar {
  margin-top: 2px;
}
.type-bar-fill {
  background: #6c757d;
  height: 100%;
}
.trend-wrap {
  margin-top: 4px;
}
.sparkline {
  width: 100%;
  height: 60px;
  display: block;
}
.spark-line {
  fill: none;
  stroke: #007bff;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
.spark-area {
  fill: rgba(0, 123, 255, 0.12);
  stroke: none;
}
.spark-dot {
  fill: #007bff;
}
.trend-axis {
  margin-top: 2px;
}
</style>
