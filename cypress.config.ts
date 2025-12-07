import { defineConfig } from "cypress";

const local = require("dotenv").config({ path: ".env.test" });

if (!process.env.TEST_ENV) {
  console.error(
    "❌ process.env.TEST_ENV is not defined. Aborting Cypress startup."
  );
  process.exit(1);
}

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
