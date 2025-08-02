// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Alternatively you can use CommonJS syntax:
// require('./commands')

/// <reference types="cypress" />

// before(() => {
//   //ensure database is running and up-to-date
//   cy.exec("node cypress/db.up.js");
// });

beforeEach(() => {
  // skip actually uploading files to bucket
  cy.intercept("PUT", "**/test-bucket/**", {
    statusCode: 200,
    body: "",
  }).as("uploadRequest");

  cy.intercept("POST", "/api/tcsdr/validateFiles").as(
    "tcsFileValidationRequest",
  );

  cy.intercept("GET", "**/list_drm_params").as("dr_params");
});

// after(() => {
//   cy.exec("node cypress/db.down.js");
// });
