import { defineConfig } from "cypress";

const local = require("dotenv").config({ path: ".env.test" });

export default defineConfig({
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },

  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents(on, config) {
      config.env = {
        ...local.parsed,
        ...config.env,
      };
      return config;
    },
  },
});
