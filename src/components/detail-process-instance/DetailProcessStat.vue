<template>
  <div id="processStat">
    <b-card bg-variant="light" text-variant="dark">
      <b-row>
        <b-col>
          <h3>
            {{processDetail.id}}
            <router-link
              :to="{name:'definition', params:{ definitionId: definitionDetail.id}, query: {baseurl}}"
            >{{ definitionDetail.key }}({{definitionDetail.version}})</router-link>
          </h3>
        </b-col>
      </b-row>
      <h4 v-if="processHistoryDetail.superProcessInstanceId">Called from
        <router-link
          :to="{name:'processdetail', params:{ processInstanceId: processHistoryDetail.superProcessInstanceId}}"
        >
          <b>{{processHistoryDetail.superProcessInstanceId}}</b>
        </router-link>
      </h4>
      <b-badge class="mb-3" :variant="getVariant()">{{processHistoryDetail.state}}</b-badge>

      <b-container class="bv-example-row">
        <b-row>
          <b-col>
            <h6 v-if="processHistoryDetail.startTime">Started {{convertDateToHumanStyle(processHistoryDetail.startTime)}}</h6>
          </b-col>
          <b-col>
            <h6
              v-if="processHistoryDetail.endTime"
            >Ended {{convertDateToHumanStyle(processHistoryDetail.endTime)}}</h6>
          </b-col>
          <b-col>
            <h6
              v-if="processHistoryDetail.durationInMillis"
            >Duration {{durationInHour(processHistoryDetail.durationInMillis)}}</h6>
          </b-col>
        </b-row>
      </b-container>

      <hr>
      <b-container class="bv-example-row">
        <b-row>
          <b-col>Business key {{processDetail.businessKey}}</b-col>
          <b-col>Version {{definitionDetail.version}}</b-col>
        </b-row>
      </b-container>
    </b-card>
  </div>
</template>

<script>
import { library } from "@fortawesome/fontawesome-svg-core";
import { faPlay, faPause } from "@fortawesome/free-solid-svg-icons";
library.add(faPlay, faPause);
export default {
  name: "DetailProcessStat",
  props: ["processInstanceId"],
  data() {
    return {
      processHistoryDetail: "",
      processInstanceRuntimeData: {},
      processDetail: {
        id: null,
        businessKey: null
      },
      definitionDetail: {
        id: null,
        key: null,
        version: null
      }
    };
  },
  watch: {
    processInstanceRuntimeData(newValue) {
      this.getProcessDefinition(newValue.definitionId)
      this.defineProcessDetails()
    },
    processHistoryDetail(newValue) {
      this.definitionDetail = {
        id: newValue.processDefinitionId,
        key: newValue.processDefinitionKey,
        version: newValue.processDefinitionVersion,
      }
      this.defineProcessDetails()
    }
  },
  methods: {
    defineProcessDetails() {
      this.processDetail = {
        id: this.processHistoryDetail.id || this.processInstanceRuntimeData.id,
        businessKey: this.processHistoryDetail.businessKey ? this.processHistoryDetail.businessKey : this.processInstanceRuntimeData.businessKey
      }
    },
    getProcessDetail() {
      this.$api()
        .get("/history/process-instance/" + this.processInstanceId)
        .then(response => {
          this.processHistoryDetail = response.data;
          if (this.processHistoryDetail.state !== "COMPLETED") {
            this.getProcessRuntimeDetail();
          }
        })
        .catch (() => {
          this.getProcessRuntimeDetail();
        })
    },
    getProcessRuntimeDetail() {
      this.$api()
        .get("/process-instance/" + this.processInstanceId)
        .then(response => {
          this.processInstanceRuntimeData = response.data;
        });
    },
    getProcessDefinition(definitionId) {
      this.$api()
      .get(`/process-definition/${definitionId}`)
      .then(response => {
        this.definitionDetail = response.data;
      });
    },
    durationInHour: function(duration) {
      var timeInHour = duration / 3600000;
      var abc = Math.round(timeInHour * 100) / 100;
      var toReturn = abc + " hours";
      return toReturn;
    },
    getVariant: function() {
      if (this.processHistoryDetail.state == "ACTIVE") {
        return "success";
      }
      if (this.processHistoryDetail.state == "SUSPENDED") {
        return "warning";
      }
      if (this.processHistoryDetail.state == "COMPLETED") {
        return "primary";
      }
      if (
        (this.processHistoryDetail.state == "EXTERNALLY_TERMINATED") |
        "INTERNALLY_TERMINATED"
      ) {
        return "danger";
      }
    },

    convertDateToHumanStyle: function(date) {
      var rel = this.$momenttrue(date)
        .startOf("second")
        .fromNow();

      var cal = this.$momenttrue(date).format("MMMM Do YYYY, H:mm:ss");

      var output = rel + " (" + cal + ") ";
      return output;
    }
  },
  mounted() {
    if (this.$route.query.processId) {
      this.$route.query.processId = this.$route.push({
        name: "DetailProcessView",
        params: { processInstanceId: this.$route.query.processId }
      });
    }
    this.getProcessDetail();
  },
  computed: {
    baseurl() {
      return this.$store.state.baseurl;
    }
  }
};
</script>

