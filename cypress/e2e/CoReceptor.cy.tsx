import { createPipelineVerifier } from "cypress/support/createPipelineVerifier";

describe("CoReceptor", () => {
  it("Submits a sample fasta", () => {
    const verifySubmission = createPipelineVerifier(
      "/api/coreceptor",
      "/api/coreceptor",
    );

    cy.visit("/coreceptor");

    cy.get(".dropzone").selectFile(
      "cypress/fixtures/coreceptor/unaligned_input.fasta",
      {
        action: "drag-drop",
      },
    );

    cy.get('[data-cy="num_sequences_parsed"]', { timeout: 10000 })
      .scrollIntoView()
      .should("be.visible")
      .and("contain.text", "5 sequences found.");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('input[name="email"')
      .scrollIntoView()
      .type("user@uni.edu")
      .should("be.visible");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get("[data-cy='submitButton']")
      .scrollIntoView()
      .should("be.visible")
      .and("not.be.disabled")
      .click();

    cy.get("[data-cy='submissionSuccessAlert']", { timeout: 20000 }).should(
      "be.visible",
    );

    verifySubmission();
  });

  it("Shows error on invalid file type", () => {
    cy.visit("/coreceptor");

    cy.get(".dropzone").selectFile(
      "cypress/fixtures/coreceptor/invalid.fastq",
      {
        action: "drag-drop",
      },
    );

    cy.get('[data-cy="fileErrorAlert"]', { timeout: 2000 })
      .scrollIntoView()
      .should("be.visible");
  });
});
