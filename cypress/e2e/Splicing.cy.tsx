import { createPipelineVerifier } from "cypress/support/createPipelineVerifier";

describe("Splicing", () => {
  it("Submits with uploaded files", () => {
    const verifySubmission = createPipelineVerifier(
      "/api/splicing",
      "/api/splicing",
    );

    cy.visit("/splicing");

    cy.get('[data-cy="pageDescription"]')
      .should("be.visible")
      .and("contain.text", "DESCRIPTION");

    cy.get('[data-cy="nextStepButton"]').last().should("be.enabled").click();

    cy.get('[data-cy="uploadsContainer"]').should("be.visible");

    cy.get('[data-cy="uploadsContainer"] .dropzone').selectFile(
      "cypress/fixtures/tcsdr/dr_r1.fastq.gz",
      {
        action: "drag-drop",
      },
    );
    cy.get('[data-cy="nextStepButton"]').last().should("be.disabled");
    cy.get('[data-cy="uploadsContainer"] .dropzone').selectFile(
      "cypress/fixtures/tcsdr/dr_r2.fastq.gz",
      {
        action: "drag-drop",
      },
    );
    cy.get('[data-cy="nextStepButton"]').last().should("be.enabled").click();

    cy.get('[data-cy="emailInput"]').type("user@uni.edu");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('[data-cy="modal"]').should("be.visible");

    cy.get('[data-cy="submitButton"]').click();

    cy.wait("@uploadRequest", { timeout: 20000 });

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

    cy.get('[data-cy="modal"]').should("be.visible");

    cy.get('[data-cy="uploadProgressContainer"]').should("not.exist");

    cy.get('[data-cy="modal"]').should("contain.text", "HTSF Location");

    cy.get('[data-cy="submitButton"]').click();

    cy.get('[data-cy="finishButton"]')
      .should("be.visible")
      .and("have.text", "Finish");

    verifySubmission();
  });
});
