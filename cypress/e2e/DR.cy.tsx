import { createPipelineVerifier } from "cypress/support/createPipelineVerifier";
import { waitForRequests } from "cypress/support/waitForRequests";

describe("DR", () => {
  it("Submits HTSF", () => {
    const email = "example@uni.edu";
    const jobID = "job_id";
    const resultsFormat = "zip";
    const verifySubmission = createPipelineVerifier(
      "/api/tcsdr",
      "/api/tcsdr",
      {
        email,
        jobID,
        resultsFormat,
      },
    );

    cy.visit("/dr");

    cy.wait("@dr_params");

    cy.get('[data-cy="dr_version_v2"]').click();

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get("[data-cy='useHTSFButton']").click();

    cy.get('[data-cy="htsf"]').type("/htsf/path");

    cy.get('[data-cy="poolName"]').type("poolName");

    cy.get('[data-cy="nextStepButton"]').last().should("be.enabled").click();

    cy.get('[data-cy="emailInput"]').should("be.visible");
    cy.get('[data-cy="jobIDInput"]').type(jobID);
    cy.get('[data-cy="resultsFormatInput"]').contains(resultsFormat).click();
    cy.get('[data-cy="emailInput"]').type(email);

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('[data-cy="confirmationModal"]').should("be.visible");

    cy.get('[data-cy="submitButton"]').click();

    cy.get('[data-cy="finishButton"]').should("exist");

    cy.get('[data-cy="submissionSuccessAlert"]')
      .should("exist")
      .and("be.visible");

    verifySubmission();
  });

  it("Submits files", () => {
    const verifySubmission = createPipelineVerifier("/api/tcsdr", "/api/tcsdr");

    const files = [
      "cypress/fixtures/tcsdr/dr_r1.fastq.gz",
      "cypress/fixtures/tcsdr/dr_r2.fastq.gz",
    ];

    cy.visit("/dr");

    cy.wait("@dr_params");

    cy.get('[data-cy="dr_version_v2"]').click();

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get("[data-cy='uploadsContainer'] .dropzone").selectFile(files, {
      action: "drag-drop",
      force: true,
    });
    cy.wait("@tcsFileValidationRequest");

    cy.get('[data-cy="nextStepButton"]').last().should("be.enabled").click();

    cy.get('[data-cy="emailInput"]').type("example@uni.edu");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('[data-cy="confirmationModal"]').should("be.visible");

    cy.get('[data-cy="submitButton"]').click();

    waitForRequests("@uploadRequest", files.length);

    cy.get('[data-cy="finishButton"]').should("exist");

    verifySubmission();
  });
});
