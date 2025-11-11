<template>
  <div id="definitionDigaram">
    <diagram
      v-if="statistics"
      :key="diagramKey"
      class="mt-2"
      :suspendedJobs="suspendedJobs"
      :processDefinitionId="definitionId"
      :statistics="statistics"
      v-on:clickedOnDiagram="PassDiagramClick"
    ></diagram>
  </div>
</template>

<script>
import * as api from "@/api/api";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faPlay, faPause } from "@fortawesome/free-solid-svg-icons";
library.add(faPlay, faPause);
export default {
  name: "DefinitionDiagram",
  props: ["definitionId", "hideSuspend"],
  data() {
    return {
      diagramKey: 0,
      jobDefinitions: null,
      suspendedJobs: null,
      ready: false,
      incidents: null,
      includeJobs: false,
      clickedElement: null,
      clickedJobDefinition: null,
      processActivityToShowArray: [],
      statistics: null
    };
  },
  mounted() {
    this.getJobs();
  },
  methods: {
    PassDiagramClick(payload) {
      this.clickedElement = payload;
      this.clickedJobDefinition = {};
      this.getJobStatus();
      this.$emit("DefinitionDiagramClick", payload);
    },
    getJobStatus() {
      this.$api()
        .post("/job-definition", {
          activityIdIn: [this.clickedElement.id],
          processDefinitionId: this.definitionId
        })
        .then(response => {
          this.clickedJobDefinition = response.data;
        });
    },
    getJobs() {
      this.$api()
        .post("/job-definition", {
          processDefinitionId: this.definitionId
        })
        .then(response => {
          this.suspendedJobs = [];
          this.jobDefinitions = response.data;
          this.getStatistics();

          this.jobDefinitions.forEach(element => {
            if (element.suspended == true) {
              this.suspendedJobs.push(element);
            }
          });
        });
    },
    getStatistics() {
      this.$api()
        .get(
          "/process-definition/" +
          this.definitionId +
          "/statistics?incidents=true"
        )
        .then(response => {
          this.ready = true;
          this.processActivityToShowArray = [];
          this.statistics = response.data;
        });
    }
  }
};
</script>

<style>
</style>
