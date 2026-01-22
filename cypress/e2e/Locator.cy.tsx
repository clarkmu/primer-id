import { createPipelineVerifier } from "cypress/support/createPipelineVerifier";
import { waitForRequests } from "cypress/support/waitForRequests";

describe("Locator", () => {
  it("Submits with test file", () => {
    const email = "example@uni.edu";
    const jobID = "job_id";
    const refGenome = "SIVmm239";
    const verifySubmission = createPipelineVerifier(
      "/api/locator",
      "/api/locator",
      {
        email,
        jobID,
        refGenome,
      },
    );

    cy.visit("/locator");

    // set ref genome to SIVmm239
    cy.get('[data-cy="radio_refGenome_1"]').click();
    cy.get('[data-cy="nextStepButton"]').last().click();

    // attach files
    const files = ["P05.fasta"];
    files.forEach((file) => {
      cy.get('[data-cy="uploadsContainer"] .dropzone').selectFile(
        `cypress/fixtures/locator/${file}`,
        {
          action: "drag-drop",
        },
      );
    });

    cy.get('[data-cy="nextStepButton"]').last().click();

    // set shared submission data
    cy.get('input[name="email"').type(email);
    cy.get('input[name="jobID"').type(jobID);
    cy.get('[data-cy="nextStepButton"]').last().click();

    //check confirmation modal
    cy.get('[data-cy="confirmationModal"]').should("be.visible");
    cy.get("[data-cy='submitButton']").click();

    // confirm submission success
    waitForRequests("@uploadRequest", files.length);
    cy.get("[data-cy='finishButton']").should("exist");

    verifySubmission();
  });

  it("Rejects fastq files", () => {
    cy.visit("/locator");
    cy.get('[data-cy="nextStepButton"]').last().click();

    // attach files
    const files = ["bad.fastq"];
    files.forEach((file) => {
      cy.get('[data-cy="uploadsContainer"] .dropzone').selectFile(
        `cypress/fixtures/locator/${file}`,
        {
          action: "drag-drop",
        },
      );
    });

    // error message should appear
    cy.get('[data-cy="fileErrorAlert"]').should("be.visible");
  });
});
