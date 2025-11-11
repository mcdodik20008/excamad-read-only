<template>
<div>
    <h2> External task </h2>
    <v-client-table :data="externalTaskJobs" :columns="columns" :options="options">
    </v-client-table>
</div>
</template>

<script>
export default {
    name: "ExternalTask",
    props: ["processInstanceId", "externalTaskJobs"],
    data() {
        return {
            columns: [
                "activityId",
                "errorMessage",
                "lockExpirationTime",
                "retries",
                "suspended",
                "workerId",
                "topicName",
            ],
            options: {
                theme: "bootstrap4",
                template: "footerPagination",
                filterByColumn: false,
                clientMultiSorting: true,
                toggleGroups: false,
                pagination: {
                    chunk: 30,
                    edge: true
                },
                perPage: 30,
                perPageValues: [30, 60, 90, 120],
                highlightMatches: true,
                skin: "table table-bordered table-hover table-sm"
            }
        };
    },
    methods: {
        getExternalTask() {
            this.$api()
                .get("/external-task?processInstanceId=" + this.processInstanceId)
                .then(response => {
                    this.externalTaskJobs = response.data;
                });
        },
    },
    mounted() {}

}
</script>

<style>

</style>
