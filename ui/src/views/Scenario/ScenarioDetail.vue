<template>
  <div v-if="loading" class="d-flex tw-justify-center tw-items-center page-loading">
    <v-progress-circular indeterminate="indeterminate" color="var(--cui-primary)"></v-progress-circular>
  </div>
  <div v-else class="scenario">
    <v-row gutters>
      <!-- scenario detail section -->
      <v-col cols="12" sm="12" xs="12" md="9" lg="9" xl="9">
        <div class="tw-px-5 tw-pt-7 scenario-detail-top">
          <div class="d-flex tw-gap-5 tw-flex-col lg:tw-flex-row lg:tw-space-x-4">
            <div class="scenario-img lg:tw-w-1/3">
              <img
                src="https://webapp-msejccxdwi33c.azurewebsites.net/static/media/ppt.542d050975f5a5cfc5df634d73b45069.svg"
              />
            </div>
            <div class="lg:tw-w-1/2">
              <h4 class="tw-text-3xl">{{ scenario.name }}</h4>
              <p class="subitle2 tw-w-90 tw-mt-5">{{ scenario.overview }}</p>
            </div>
            <div class="lg:tw-w-1/3 tw-pr-10">
              <v-btn block color="var(--cui-primary)" class="tw-text-white py-5 tw-font-semibold"> GET THIS </v-btn>
            </div>
          </div>
          <div class="tw-mt-10 tab">
            <ul class="d-flex tw-list-none tw-text-left">
              <li v-for="(item, index) in tabItems" :key="index" @click="setActive(index)">
                <a :class="{ active: isActive(index) }" href="#"> {{ item }}</a>
              </li>
            </ul>
          </div>
        </div>

        <!-- overview tabs content -->
        <div class="tw-p-4">
          <div class="tw-my-8 overview">
            <p class="subitle2 tw-pl-10">
              Use your existing security camera infrastructure to enable PPE Compliance at your facility
            </p>
            <div
              class="tw-grid tw-grid-cols-1 md:tw-grid-cols-5 sm:tw-grid-cols-2 xs:tw-grid-cols-3 tw-gap-4 my-10 tw-mt-10"
            >
              <div class="d-flex tw-justify-center tw-items-center">
                <img src="../../assets/img/ppt20.svg" />
              </div>

              <div class="d-flex tw-justify-center tw-items-center">
                <img src="../../assets/img/ppt21.svg" />
              </div>

              <div class="d-flex tw-justify-center tw-items-center">
                <img src="../../assets/img/ppt22.svg" />
              </div>

              <div class="d-flex tw-justify-center tw-items-center">
                <img src="../../assets/img/ppt23.svg" />
              </div>

              <div class="d-flex tw-justify-center tw-items-center">
                <img src="../../assets/img/ppt24.svg" />
              </div>
            </div>
          </div>

          <!-- accuracy tab content -->
          <div class="tw-my-5 tw-mx-5 accuracy">
            <h3 class="text-xl">Accuracy</h3>
            <v-btn color="var(--cui-primary)" class="tw-text-white tw-font-semibold tw-my-5">
              Model: PPE Detection 2.2.1</v-btn
            >

            <div
              class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 sm:tw-grid-cols-2 xs:tw-grid-cols-2 tw-gap-4 my-10 tw-mt-10"
            >
              <div>
                <p class="subtitle2">Dataset : 250,340 images</p>
                <v-chip-group>
                  <v-chip>View Details</v-chip>

                  <v-chip>Coutomize</v-chip>
                </v-chip-group>
              </div>
              <div class="d-flex tw-justify-between tw-items-center">
                <div>
                  <img src="../../assets/img/ppt22.svg" />
                </div>

                <div>
                  <img src="../../assets/img/ppt23.svg" />
                </div>

                <div>
                  <img src="../../assets/img/ppt24.svg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-col>

      <!-- simillar section -->
      <v-col cols="12" sm="12" xs="12" md="3" lg="3" xl="3">
        <div class="right-section">
          <h3 class="text-xl tw-text-center">You may also need</h3>
        </div>
      </v-col>
    </v-row>
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
      activeIndex: 0,
      tabItems: ['Overview', 'Accuracy', 'Event', 'User Manual'],
    };
  },

  mounted() {
    this.loading = false;
    const scenario = data.scenarios.find((item) => item.id === this.$route.params.id);
    this.scenario = scenario;
  },

  methods: {
    setActive(index) {
      this.activeIndex = index;
    },
    isActive(index) {
      return index === this.activeIndex;
    },
  },
};
</script>

<style scoped>
.scenario-img img {
  width: 100%;
}
.scenario-detail-top {
  background: var(--cui-bg-app-bar);
}

.tab {
  border-bottom: 1px solid #cbc4c4;
  height: 60px;
  line-height: 50px;
  width: 100%;
}

.tab ul li a {
  color: #183153;
  padding: 20px 20px;
  text-decoration: none;
  font-size: 1.3rem;
}

.tab ul li a:hover {
  color: var(--cui-primary);
  border-bottom: 2px solid var(--cui-primary);
}

.tab ul li a.active {
  color: var(--cui-primary);
  border-bottom: 2px solid var(--cui-primary);
}

.overview,
.accuracy {
  border-bottom: 1px solid #cbc4c4;
}
</style>
