describe("CoReceptor", () => {
  it("Submits a sample fasta", () => {
    cy.intercept("POST", "**/submit", (req) => {
      req.reply((res) => {
        res.send({
          statusCode: 200,
          body: {
            success: true,
            message: "Submission received",
            submission_id: "test-submission-id",
          },
        });
      });
    }).as("submitCoreceptor");

    cy.visit("/coreceptor");

    cy.get(".dropzone").selectFile(
      "cypress/fixtures/coreceptor/unaligned_input.fasta",
      {
        action: "drag-drop",
      },
    );

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('input[name="email"')
      .scrollIntoView()
      .type("user@uni.edu")
      .should("be.visible");

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('[data-cy="confirmationModal"]').should("be.visible");

    cy.get('[data-cy="submitButton"]').click();

    cy.wait("@submitCoreceptor");

    cy.get("[data-cy='finishButton']").should("exist").and("be.visible");

    cy.get('[data-cy="submissionSuccessAlert"]')
      .should("exist")
      .and("be.visible");
  });

  it("Shows error on invalid file type", () => {
    cy.visit("/coreceptor");

    cy.get(".dropzone").selectFile(
      "cypress/fixtures/coreceptor/invalid.fastq",
      {
        action: "drag-drop",
      },
    );

    cy.get(`[data-cy="upload-file-error-invalid.fastq"]`, { timeout: 2000 })
      .scrollIntoView()
      .should("be.visible");

    cy.get(".dropzone").selectFile("cypress/fixtures/coreceptor/empty.fasta", {
      action: "drag-drop",
    });

    cy.get(`[data-cy="upload-file-error-empty.fasta"]`, { timeout: 2000 })
      .scrollIntoView()
      .should("be.visible");

    cy.get(".dropzone").selectFile(
      "cypress/fixtures/coreceptor/unaligned_input.fasta",
      {
        action: "drag-drop",
      },
    );

    cy.get(`[data-cy="upload-file-error-unaligned_input.fasta"]`, {
      timeout: 2000,
    }).should("not.exist");
  });
});
