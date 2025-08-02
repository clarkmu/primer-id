import { createPipelineVerifier } from "cypress/support/createPipelineVerifier";
import { waitForRequests } from "cypress/support/waitForRequests";

describe("Splicing", () => {
  it("Submits with uploaded files", () => {
    const verifySubmission = createPipelineVerifier(
      "/api/splicing",
      "/api/splicing",
    );

    const files = [
      "cypress/fixtures/tcsdr/dr_r1.fastq.gz",
      "cypress/fixtures/tcsdr/dr_r2.fastq.gz",
    ];

    cy.visit("/splicing");

    cy.get('[data-cy="pageDescription"]')
      .should("be.visible")
      .and("contain.text", "DESCRIPTION");

    cy.get('[data-cy="nextStepButton"]').last().should("be.enabled").click();

    cy.get('[data-cy="uploadsContainer"]').should("be.visible");

    cy.get('[data-cy="uploadsContainer"] .dropzone').selectFile(files[0], {
      action: "drag-drop",
    });
    cy.get('[data-cy="nextStepButton"]').last().should("be.disabled");
    cy.get('[data-cy="uploadsContainer"] .dropzone').selectFile(files[1], {
      action: "drag-drop",
    });
    cy.get('[data-cy="nextStepButton"]').last().should("be.enabled").click();

    cy.get('[data-cy="emailInput"]').type("user@uni.edu");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('[data-cy="confirmationModal"]').should("be.visible");

    cy.get('[data-cy="submitButton"]').click();

    waitForRequests("@uploadRequest", files.length);

    cy.get('[data-cy="finishButton"]')
      .should("be.visible")
      .and("have.text", "Finish");

    verifySubmission();
  });

  it("Submits with HTSF location", () => {
    const verifySubmission = createPipelineVerifier(
      "/api/splicing",
      "/api/splicing",
    );

    cy.visit("/splicing");

    cy.get('[data-cy="pageDescription"]')
      .should("be.visible")
      .and("contain.text", "DESCRIPTION");

    cy.get('[data-cy="nextStepButton"]').last().should("be.enabled").click();

    cy.get('[data-cy="useHTSFButton"]').click();

    cy.get('[data-cy="htsfContainer"]').should("be.visible");

    cy.get('[data-cy="nextStepButton"]').last().should("be.disabled");

    cy.get('[data-cy="htsf"]').type("/htsf/path");

    cy.get('[data-cy="poolName"]').type("poolName");

    cy.get('[data-cy="nextStepButton"]').last().should("be.enabled").click();

    cy.get('[data-cy="emailInput"]').type("user@uni.edu");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('[data-cy="confirmationModal"]').should("be.visible");

    cy.get('[data-cy="uploadProgressContainer"]').should("not.exist");

    cy.get('[data-cy="confirmationModal"]').should(
      "contain.text",
      "HTSF Location",
    );

    cy.get('[data-cy="submitButton"]').click();

    cy.get('[data-cy="finishButton"]')
      .should("be.visible")
      .and("have.text", "Finish");

    verifySubmission();
  });
});
