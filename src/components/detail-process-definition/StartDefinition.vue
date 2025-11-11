<template>
  <div id="startDefinition">
  </div>
</template>

<script>
import * as api from "@/api/api";
import BpmnModdle from "bpmn-moddle";
import camundaModdle from "camunda-bpmn-moddle/resources/camunda";
import camundaExtensionModule from "camunda-bpmn-moddle/lib";

import camundaModdleDescriptor from "camunda-bpmn-moddle/resources/camunda";
import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
import BpmnModeler from "bpmn-js/lib/Modeler";
import { library } from "@fortawesome/fontawesome-svg-core";

import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
library.add(faMinus, faPlus);
export default {
  name: "StartDevinition",
  props: ["definitionId"],
  data() {
    return {
      query: "",
      businessKey: "",
      arrayOfVaribales: [{ name: "initiator", type: "String", value: "" }],
      activityList: [],
      instanceToCopyVariables: "",
      variablesFromHistory: "",
      variablesTypes: [
        "Boolean",
        "Date",
        "String",
        "Double",
        "Integer",
        "Long",
        "Object"
      ],
      selectedActivity: "",
      startWithVariable: true,
      startFromSpecificActivity: false,
      definitionInXml: "",
      ready: false
    };
  },
  computed: {
    profile() {
      return this.$store.getters.getProfile;
    },
    isAuthenticated() {
      return this.$store.getters.isAuthenticated;
    }
  },
  methods: {
    getStartFormVariables() {
      this.$api().get("/process-definition/" + this.definitionId + "/form-variables").then(response => {
        if (response.data != null) {


          for (var key in response.data) {
            if (response.data[key].type != "Object") {
              var obj = {
                name: key,
                type: response.data[key].type,
                value: response.data[key].value
              }
            }
            if (obj.name != "initiator") {
              this.arrayOfVaribales.push(obj);
            }
          }
        }

      })
    },
    removeItem(item) {
      this.arrayOfVaribales.splice(item, 1);
    },
    getUserName() {
      return this.profile.userName;
    },

    serialazier(item) {
      var searchobj = "";
      searchobj = item.id;
      if ("name" in item) {
        searchobj = searchobj + " (" + item.name + ")";
      }
      if ("delegateExpression" in item) {
        searchobj = searchobj + " (" + item.delegateExpression + ")";
      }
      return searchobj;
    },
    getActivityList() {
      this.$api()
        .get("/process-definition/" + this.definitionId + "/xml")
        .then(response => {
          this.definitionInXml = response.data.bpmn20Xml;
          this.readModel();
        });
    },
    addVariable() {
      var obj = {
        name: "",
        type: "String",
        value: ""
      };
      this.arrayOfVaribales.push(obj);
    },
    getVariableHistory() {
      this.$api()
        .get(
          "/history/variable-instance?processInstanceId=" +
          this.instanceToCopyVariables
        )
        .then(response => {
          this.variablesFromHistory = response.data;
          if (
            this.variablesFromHistory != null &&
            this.variablesFromHistory.length > 0
          )
            this.arrayOfVaribales = [];
          {
            this.variablesFromHistory.forEach(element => {
              var obj = {
                name: element.name ? element.name : "",
                type: element.type ? element.type : "",
                value: this.SerializeObjects(element.value)
              };
              if (
                "valueInfo" in element &&
                element.valueInfo.objectTypeName != null &&
                element.valueInfo.serializationDataFormat != null
              ) {
                var valueInfo = {
                  objectTypeName: element.valueInfo.objectTypeName,
                  serializationDataFormat: "application/json"
                };
                obj["valueInfo"] = valueInfo;
              }

              this.arrayOfVaribales.push(obj);
            });
          }
        });
    },
    SerializeObjects(value) {
      if (value && typeof value === "object" && value.constructor === Object) {
        return JSON.stringify(value);
      }
      if (value instanceof Array) {
        return JSON.stringify(value);
      } else return value;
    },
    readModel() {
      var moddle = new BpmnModdle({ camunda: camundaModdle });
      var vm = this;
      vm.activityList = [];
      this.moddle = moddle.fromXML(this.definitionInXml, function (
        err,
        definitions
      ) {
        definitions.rootElements.forEach(element => {
          if (element.$type == "bpmn:Process" && element.isExecutable == true) {
            element.flowElements.forEach(flowelement => {
              if (flowelement.$type != "bpmn:SequenceFlow") {
                vm.activityList.push(flowelement);
              }
            });
          }
        });
      });
    }
  },
  mounted() {
    this.getActivityList();
    this.arrayOfVaribales[0].value = this.getUserName();
    this.getStartFormVariables();
  },
  watch: {
    isAuthenticated(newValue, OldValue) {
      this.arrayOfVaribales[0].value = this.getUserName();
    }
  }
};
</script>

<style>
</style>
