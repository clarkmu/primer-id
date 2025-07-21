import { createPipelineVerifier } from "cypress/support/createPipelineVerifier";

describe("DR", () => {
  it("Submits HTSF", () => {
    const verifySubmission = createPipelineVerifier("/api/tcsdr", "/api/tcsdr");

    cy.visit("/dr");

    cy.get('[data-cy="dr_version_v2"]').click();

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get("[data-cy='useHTSFButton']").click();

    cy.get('[data-cy="htsf"]').type("/htsf/path");

    cy.get('[data-cy="poolName"]').type("poolName");

    cy.get('[data-cy="nextStepButton"]').last().should("be.enabled").click();

    cy.get('[data-cy="emailInput"]').type("example@uni.edu");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('[data-cy="modal"]').should("be.visible");

    cy.get('[data-cy="submitButton"]').click();

    cy.get('[data-cy="finishButton"]', { timeout: 20000 }).should("exist");

    verifySubmission();
  });

  it("Submits files", () => {
    const verifySubmission = createPipelineVerifier("/api/tcsdr", "/api/tcsdr");

    cy.visit("/dr");

    cy.get('[data-cy="dr_version_v2"]').click();

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get("[data-cy='uploadsContainer'] .dropzone", {
      timeout: 5000,
    }).selectFile(
      [
        "cypress/fixtures/tcsdr/dr_r1.fastq.gz",
        "cypress/fixtures/tcsdr/dr_r2.fastq.gz",
      ],
      {
        action: "drag-drop",
        force: true,
      },
    );

    cy.intercept("POST", "/api/tcsdr/validateFiles").as(
      "fileValidationRequest",
    );
    cy.wait("@fileValidationRequest");

    cy.get('[data-cy="nextStepButton"]').last().should("be.enabled").click();

    cy.get('[data-cy="emailInput"]').type("example@uni.edu");
    cy.get('[data-cy="nextStepButton"]').last().click();
    cy.get('[data-cy="modal"]').should("be.visible");
    cy.get('[data-cy="submitButton"]').click();
    cy.get('[data-cy="finishButton"]', { timeout: 20000 }).should("exist");

    verifySubmission();
  });
});
