<template>
  <div id="dashboard-stats" class="mb-4">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h4 class="mb-0">Overview</h4>
      <div>
        <small v-if="lastUpdated" class="text-muted mr-2">
          updated {{ convertDateToHumanStyle(lastUpdated) }}
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
      <b-card-group deck class="mb-3">
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
          <div class="metric-label">Definitions with incidents</div>
        </b-card>
      </b-card-group>

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
                  <div class="health-bar">
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
          <ul v-else class="list-unstyled">
            <li :key="t.type" v-for="t in incidentsByType" class="d-flex justify-content-between">
              <span>{{ t.type }}</span>
              <b-badge variant="secondary">{{ t.count }}</b-badge>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { exportToCsv } from "@/utils/csv";

const TOP_LIMIT = 10;

export default {
  name: "DashboardStats",
  data() {
    return {
      loading: false,
      error: null,
      lastUpdated: null,
      statistics: [],
      runningInstances: 0,
      openIncidents: 0
    };
  },
  computed: {
    hasData() {
      return this.lastUpdated != null && this.error == null;
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
      const ratio = row.incidents / row.instances;
      return Math.min(100, Math.round(ratio * 100));
    },
    convertDateToHumanStyle(date) {
      return this.$momenttrue(date).startOf("second").fromNow();
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
        })
        .catch(err => {
          this.error = err && err.message ? err.message : String(err);
        })
        .finally(() => {
          this.loading = false;
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
    }
  },
  mounted() {
    this.load();
  }
};
</script>

<style scoped>
.metric {
  font-size: 2.2rem;
  font-weight: 600;
  line-height: 1;
}
.metric-label {
  font-size: 0.8rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.health-bar {
  background: #e9ecef;
  border-radius: 3px;
  height: 8px;
  overflow: hidden;
}
.health-bar-fill {
  background: linear-gradient(90deg, #ffc107, #dc3545);
  height: 100%;
}
</style>
