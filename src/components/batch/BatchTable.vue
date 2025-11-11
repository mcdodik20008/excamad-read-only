<template>
<div id="BatchTable">
    <div v-if="loading" style="text-align: center; margin-bottom: 10px">
      Sending {{requestCounter}}/{{batches.length}}
    </div>


    <b-table :fields="fields" small bordered striped :items="batches" caption-top>
    </b-table>
</div>
</template>

<script>
export default {
    name: "BatchTable",
    data() {
        return {
            loading: false,
            requestCounter: 0,
            batches: [],
            fields: ["id", {
                    key: "type",
                    sortable: true
                }, {
                    key: "totalJobs",
                    sortable: true
                }, {
                    key: "jobsCreated",
                    sortable: true
                }, {
                    key: "remainingJobs",
                    sortable: true
                }, {
                    key: "completedJobs",
                    sortable: true
                },
                {
                    key: "failedJobs",
                    sortable: true
                },
                {
                    key: "suspended",
                    sortable: true
                },
            ]
        }
    },
    mounted() {
        this.getBatches();
    },
    methods: {
        getBatches() {
            this.$api().get('/batch/statistics').then(response => {
                this.batches = response.data;
            })
        },

    }
}
</script>

<style>
.main-buttons {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
  gap: 10px;
}
</style>
