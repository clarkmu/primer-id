import { createPipelineVerifier } from "cypress/support/createPipelineVerifier";
import { waitForRequests } from "cypress/support/waitForRequests";

describe("OGV", () => {
  it("Submits with 2 subjects", () => {
    const verifySubmission = createPipelineVerifier("/api/ogv", "/api/ogv");

    cy.visit("/ogv");

    const files = [
      "CAP188/CAP188_ENV_2_all_hap.fasta",
      "CAP188/CAP188_ENV_3_all_hap.fasta",
      "CAP188/CAP188_ENV_4_all_hap.fasta",
      "CAP188/CAP188_NEF_1_all_hap.fasta",
      "CAP206/CAP206_ENV_2_all_hap.fasta",
      "CAP206/CAP206_ENV_4_all_hap.fasta",
      "CAP206/CAP206_GAG_1_all_hap.fasta",
    ];

    files.forEach((file) => {
      cy.get('[data-cy="uploadsContainer"] .dropzone').selectFile(
        `cypress/fixtures/ogv/${file}`,
        {
          action: "drag-drop",
        },
      );
    });

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get("div[data-cy='CAP188'] input").type("2");
    cy.get("div[data-cy='CAP206'] input").type("2");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('input[name="email"').type("user@uni.edu");
    cy.get('input[name="jobID"').type("jobID");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('[data-cy="confirmationModal"]').should("be.visible");

    cy.get("[data-cy='submitButton']").click();

    waitForRequests("@uploadRequest", files.length);

    cy.get("[data-cy='finishButton']").should("exist");

    verifySubmission();
  });

  it("Ensures subject_sample format", () => {
    cy.visit("/ogv");

    ["CAP188/CAP188_ENV_2_all_hap.fasta", "invalidfile.fasta"].forEach(
      (file) => {
        cy.get('[data-cy="uploadsContainer"] .dropzone').selectFile(
          `cypress/fixtures/ogv/${file}`,
          {
            action: "drag-drop",
          },
        );
      },
    );

    cy.get('[data-cy="fileErrorAlert"]').scrollIntoView().should("be.visible");

    cy.get('[data-cy="uploadsContainer"]').should(
      "not.contain.text",
      "invalidfile.fasta",
    );
  });

  it("Prevents submission if conversion WPI missing", () => {
    cy.visit("/ogv");

    cy.get('[data-cy="uploadsContainer"] .dropzone').selectFile(
      `cypress/fixtures/ogv/CAP188/CAP188_ENV_2_all_hap.fasta`,
      {
        action: "drag-drop",
      },
    );

    cy.get('[data-cy="nextStepButton"]', { timeout: 10000 }).last().click();

    cy.get("div[data-cy='CAP188'] input").type("2");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('input[name="email"').type("example@uni.edu");

    cy.get('[data-cy="uploadsContainer"] .dropzone').selectFile(
      `cypress/fixtures/ogv/CAP206/CAP206_ENV_2_all_hap.fasta`,
      {
        action: "drag-drop",
      },
    );

    cy.get("[data-cy='nextStepButton']").last().should("be.disabled");
  });
});
