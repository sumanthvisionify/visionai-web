<template>
  <div v-if="loading" class="d-flex tw-justify-center tw-items-center page-loading">
    <v-progress-circular indeterminate="indeterminate" color="var(--cui-primary)"></v-progress-circular>
  </div>
  <div v-else class="tw-my-2 tw-mx-4">
    <div class="d-flex tw-gap-5">
      <div class="d-flex tw-items-center">
        <div class="page-title">{{ scenario.name }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import data from '../../assets/scenarios-override.json';

export default {
  name: 'ScenarioDetail',

  beforeRouteLeave(to, from, next) {
    this.loading = true;
    next();
  },

  data() {
    return {
      loading: true,
      scenario: {},
    };
  },

  mounted() {
    this.loading = false;
    const scenario = data.scenarios.find((item) => item.id === this.$route.params.id);
    this.scenario = scenario;
  },

  methods: {},
};
</script>

<style scoped></style>
