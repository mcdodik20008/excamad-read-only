<template>
  <div id="deleteVariable">
  </div>
</template>

<script>
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowsAlt,
  faPenSquare,
  faFileAlt
} from "@fortawesome/free-solid-svg-icons";
library.add(faArrowsAlt);
library.add(faFileAlt);
library.add(faPenSquare);
export default {
  name: "VariableSingleDelete",
  props: ["processInstanceId", "variableName", "variableValue"],
  data() {
    return {
    }
  },
  methods: {
  }
}
</script>
