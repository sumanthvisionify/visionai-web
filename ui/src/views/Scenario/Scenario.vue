<template>
  <div v-if="loading" class="d-flex tw-justify-center tw-items-center page-loading">
    <v-progress-circular indeterminate="indeterminate" color="var(--cui-primary)"></v-progress-circular>
  </div>
  <div v-else>
    <div class="sm:tw-block md:tw-block lg:tw-flex tw-gap-5 tw-px-4 tw-items-center top-category-fixed">
      <div class="sm:tw-mx-2">
        <div class="page-title">{{ $route.name }}</div>
      </div>

      <div class="category_section">
        <div class="category_section-item">
          <v-btn class="main_cat_btn" @click="allCategory()">All</v-btn>
          <v-btn v-for="item in categories" :key="item" @click="selectCategory(item)" class="catergories_btn">
            {{ item }}
          </v-btn>
        </div>
      </div>
    </div>

    <div class="tw-my-2 tw-mx-4 tw-mt-10 scenario-section">
      <div v-for="item in scenarios" :key="item.id" class="tw-my-10">
        <div class="d-flex tw-justify-between tw-mx-2" :id="item.category">
          <div>
            <h3>{{ item.category }}</h3>
          </div>
          <div class="viewAll">
            <a href="#" class="view-all-link" color="var(--cui-primary)">View All</a>
          </div>
        </div>
        <v-row no-gutters>
          <v-col v-for="data in item.data" :key="data.id" cols="12" sm="12" xs="12" md="6" lg="4" xl="3">
            <v-sheet class="ma-2 tw-rounded-lg">
              <div class="tw-h-48">
                <img :src="data.thumbnail" class="catergories_img" alt="" />
              </div>
              <div class="tw-px-10 tw-py-5 card_bottom">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">{{ data.name }}</h3>
                  <div class="tw-my-2 tw-h-16">
                    <span
                      v-for="tag in data.tags"
                      :key="tag"
                      class="tw-bg-gray-100 tw-rounded-md tw-px-2 tw-py-1 tw-text-xs" style="margin: 5px; padding: 5px;"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
                <div class="d-flex tw-justify-center tw-items-center tw-mt-7">
                  <v-btn
                    block
                    color="var(--cui-primary)"
                    class="tw-text-white py-5 tw-font-semibold"
                    @click="navigateDetail(data.id)"
                  >
                    GET THIS
                  </v-btn>
                </div>
              </div>
            </v-sheet>
          </v-col>
        </v-row>
      </div>
    </div>
  </div>
</template>

<script>
import { mdiLockOpen, mdiTrashCanOutline } from '@mdi/js';
import data from '../../assets/scenarios-override.json';

export default {
  name: 'Scenario',

  beforeRouteLeave(to, from, next) {
    this.loading = true;
    next();
  },

  data() {
    return {
      loading: true,

      icons: {
        mdiLockOpen,
        mdiTrashCanOutline,
      },

      oldSelected: false,
      listMode: false,
      showListOptions: true,
      scenarios: [],
      categories: [],
      globalArray: [],
    };
  },

  mounted() {
    this.loading = false;
    let tempArry = [];
    // let globalArray = [];

    data.scenarios.forEach((element) => {
      element.categories.forEach((item) => {
        tempArry.push(item);
        let uniq = [...new Set(tempArry)];
        this.categories = uniq;
      });
    });

    this.categories.map((category) => {
      let obj = { category: '', data: [] };
      obj['category'] = category;
      obj['data'] = [];
      this.globalArray.push(obj);
    });
    this.globalArray = [...new Set(this.globalArray)];

    data.scenarios.forEach((element) => {
      this.globalArray.map((global) => {
        if (element.categories.includes(global['category'])) {
          global['data'].push(element);
        }
      });
    });
    this.scenarios = this.globalArray;
  },

  methods: {
    selectCategory(view) {
      // var access = document.getElementById(view);
      // access.scrollIntoView({ behavior: 'smooth' }, true);
      const allCategory = this.globalArray.filter((item) => item.category === view);
      this.scenarios = allCategory;
    },
    allCategory() {
      data.scenarios.forEach((element) => {
        this.globalArray.map((global) => {
          if (element.categories.includes(global['category'])) {
            global['data'].push(element);
          }
        });
      });
      this.scenarios = this.globalArray;
    },
    navigateDetail(route) {
      this.$router.push(`/scenarioDetail/${route}`);
    },
  },
};
</script>

<style scoped>
.scenario-section {
  position: relative;
  top: 6rem;
}

.top-category-fixed {
  position: fixed;
  width: 100%;
  z-index: 1;
  background: rgba(var(--cui-bg-app-bar-rgb)) !important;
  box-shadow: 0px 3px 3px -2px rgb(0 0 0 / 15%), 0px 3px 4px 0px rgb(0 0 0 / 1%), 0px 1px 8px 0px rgb(0 0 0 / 1%) !important;
}

.category_section {
  display: flex;
  flex-wrap: wrap;
  justify-content: left;
}

.category_section-item {
  flex-basis: calc(100% - 20px);
  margin: 15px;
}

.page-title {
  font-size: 1.3rem !important;
  letter-spacing: -0.025em !important;
  font-weight: 700 !important;
  line-height: 1.5 !important;
  margin-bottom: 50px;
}

.card_bottom {
  border: 1px solid #fadede;
}

.catergories_btn {
  border: 1px solid var(--cui-primary);
  color: var(--cui-primary);
  margin: 5px;
}

.catergories_btn:hover {
  background: var(--cui-primary);
  color: white;
  transition: 0.6s;
}

.main_cat_btn {
  background: var(--cui-primary) !important;
  color: white !important;
}

.viewAll .view-all-link {
  color: var(--cui-primary);
  text-decoration: none;
  font-size: 16px;
}

.catergories_img {
  width: 100%;
  height: 100%;
}

@media (max-width: 568px) {
  .scenario-section {
    top: 15rem;
  }
}
@media (min-width: 568px) and (max-width: 728px) {
  .scenario-section {
    top: 12rem;
  }
}
@media (min-width: 728px) and (max-width: 1024px) {
  .scenario-section {
    top: 12rem;
  }
}
@media (min-width: 1024px) and (max-width: 1680px) {
  .scenario-section {
    top: 8rem;
  }
}
</style>
