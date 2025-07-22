import { createPipelineVerifier } from "cypress/support/createPipelineVerifier";

describe("TCS Pipeline", () => {
  it("JSON input + file uploads", () => {
    const verifySubmission = createPipelineVerifier("/api/tcsdr", "/api/tcsdr");

    cy.visit("/tcs");

    cy.get('[data-cy="form_procedure_json"]').click();

    const jsonFileFixture = "tcsdr/tcs_params.json";
    const jsonFile = `cypress/fixtures/${jsonFileFixture}`;

    cy.get("[data-cy='use_json_input'] [data-cy='dropzone']").selectFile(
      jsonFile,
      {
        action: "drag-drop",
      },
    );

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get("[data-cy='uploadsContainer'] [data-cy='dropzone']").selectFile(
      [
        "cypress/fixtures/tcsdr/dr_r1.fastq.gz",
        "cypress/fixtures/tcsdr/dr_r2.fastq.gz",
      ],
      {
        action: "drag-drop",
      },
    );

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.fixture(jsonFileFixture).then((json) => {
      cy.get('[data-cy="emailInput"]').should("have.value", json.email);
    });

    cy.get('[data-cy="nextStepButton"]').last().click();

    cy.get('[data-cy="submitButton"]').click();

    cy.wait("@uploadRequest", { timeout: 20000 });

    cy.get("[data-cy='finishButton']").should("exist");

    verifySubmission();
  });

  it("Manually enter 2 primers + HTSF", () => {
    const verifySubmission = createPipelineVerifier("/api/tcsdr", "/api/tcsdr");

    cy.visit("/tcs");

    cy.get('[data-cy="form_procedure_manual"]').click();

    // General Settings
    cy.get('[data-cy="radio_platformFormat_1"]').click();
    cy.get('[data-cy="errorRate"]').type("0.05");

    // Primer 1 with EndJoin and QC and Trim
    cy.get('[data-cy="primerContainer_0"]').within(() => {
      cy.get('[data-cy="region"]').type("ENV");
      cy.get('[data-cy="forward"]').type("ACGTACGTACGTATCG");
      cy.get('[data-cy="cdna"]').type("ACGTACGTACGTNNNNNNNNNNATCG");
      cy.get('[data-cy="primerNextButton"]').click();
      // EndJoin
      cy.get('[data-cy="endJoin"]')
        .scrollIntoView()
        .should("be.visible")
        .click();
      cy.get('[data-cy="radio_endJoinOption_1"]')
        .scrollIntoView()
        .should("be.visible")
        .click();
      cy.get('[data-cy="endJoinOverlap"]')
        .scrollIntoView()
        .should("be.visible")
        .type("5");
      cy.get('[data-cy="primerNextButton"]').click();
      // QC
      cy.get('[data-cy="qc"]').click();
      cy.get('[data-cy="radio_qc_refGenome_0"]')
        .scrollIntoView()
        .should("be.visible")
        .click();
      cy.get('[data-cy="refStart"]').type("5");
      cy.get('[data-cy="refEnd"]').type("2950");
      cy.get('[data-cy="allowIndels"]').click();
      cy.get('[data-cy="primerNextButton"]').click();
      // Trim
      cy.get('[data-cy="trim"]').click();
      cy.get('[data-cy="radio_trim_refGenome_1"]')
        .scrollIntoView()
        .should("be.visible")
        .click();
      cy.get('[data-cy="trimStart"]').type("400");
      cy.get('[data-cy="trimEnd"]').type("600");
      cy.get('[data-cy="primerNextButton"]').click();
      // Summary
      cy.get('[data-cy="primerSummary"]').scrollIntoView().should("be.visible");
      cy.get('[data-cy="primerAddButton"]').click();
    });

    // Primer 2 with EndJoin and no QC
    cy.get('[data-cy="primerContainer_1"]').within(() => {
      cy.get('[data-cy="region"]').type("ENV");
      cy.get('[data-cy="forward"]').type("ACGTACGTACGTATCG");
      cy.get('[data-cy="cdna"]').type("ACGTACGTACGTNNNNNNNNNNATCG");
      cy.get('[data-cy="primerNextButton"]').click();
      // EndJoin
      cy.get('[data-cy="endJoin"]')
        .scrollIntoView()
        .should("be.visible")
        .click();
      cy.get('[data-cy="radio_endJoinOption_0"]')
        .scrollIntoView()
        .should("be.visible")
        .click();
      cy.get('[data-cy="endJoinOverlap"]').should("not.exist");
      cy.get('[data-cy="primerNextButton"]').click();
      // QC
      cy.get('[data-cy="qc"]').scrollIntoView().should("be.visible");
      cy.get('[data-cy="primerNextButton"]').click();
      // Summary
      cy.get('[data-cy="primerSummary"]').scrollIntoView().should("be.visible");

      cy.get('[data-cy="primerBackButton"]').click();
      cy.get('[data-cy="qc"]').scrollIntoView().should("be.visible");
      cy.get('[data-cy="primerNextButton"]').click();
      cy.get('[data-cy="primerSummary"]').scrollIntoView().should("be.visible");
      cy.get('[data-cy="primerAddButton"]').click();
    });

    // Primer 3 no EndJoin
    cy.get('[data-cy="primerContainer_2"]').within(() => {
      cy.get('[data-cy="region"]').type("ENV");
      cy.get('[data-cy="forward"]').type("ACGTACGTACGTATCG");
      cy.get('[data-cy="cdna"]').type("ACGTACGTACGTNNNNNNNNNNATCG");
      cy.get('[data-cy="primerNextButton"]').click();
      // EndJoin
      cy.get('[data-cy="endJoin"]').scrollIntoView().should("be.visible");
      cy.get('[data-cy="primerNextButton"]').click();
      // Summary
      cy.get('[data-cy="primerSummary"]').scrollIntoView().should("be.visible");

      cy.get('[data-cy="primerBackButton"]').click();
      cy.get('[data-cy="endJoin"]').scrollIntoView().should("be.visible");
      cy.get('[data-cy="primerNextButton"]').click();
      cy.get('[data-cy="primerSummary"]').scrollIntoView().should("be.visible");
      cy.get('[data-cy="primerFinishButton"]').click();
    });

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

  it("Shows warnings for missing R2 file", () => {
    cy.visit("/tcs");

    cy.get('[data-cy="form_procedure_json"]').click();

    const jsonFileFixture = "tcsdr/tcs_params.json";
    const jsonFile = `cypress/fixtures/${jsonFileFixture}`;

    cy.get("[data-cy='use_json_input'] [data-cy='dropzone']").selectFile(
      jsonFile,
      {
        action: "drag-drop",
      },
    );

    cy.get('[data-cy="nextStepButton"]').last().click();

    const fileName = "dr_r1.fastq.gz";

    cy.intercept("POST", "/api/tcsdr/validateFiles").as(
      "fileValidationRequest",
    );

    cy.get("[data-cy='uploadsContainer'] [data-cy='dropzone']").selectFile(
      [`cypress/fixtures/tcsdr/${fileName}`],
      {
        action: "drag-drop",
      },
    );

    cy.wait("@fileValidationRequest");

    cy.get('[data-cy="upload-file-error"]')
      .scrollIntoView()
      .should("be.visible")
      .and("contain.text", fileName);
  });
});

describe("TCS Saved Primers", () => {
  const USE_SAVED_PRIMERS_KEY = "primer-id-use-saved-primers";
  const STORAGE_SAVED_PRIMERS_KEY = "primer-id-saved-primers";
  const samplePrimer = {
    region: "ENV",
    forward: "ACGTACGT",
    cdna: "ACGTNNNNNNNN",
  };

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit("/tcs");
  });

  it("CRUD Saved Primer", () => {
    // Enable checkbox
    cy.get('[data-cy="useSavedPrimers"]').check().should("be.checked");

    // Set localStorage directly
    cy.window().then((win) => {
      win.localStorage.setItem(USE_SAVED_PRIMERS_KEY, "true");
      win.localStorage.setItem(
        STORAGE_SAVED_PRIMERS_KEY,
        JSON.stringify([samplePrimer]),
      );
    });

    // Reload and validate loaded saved primers
    cy.reload();
    cy.get('[data-cy="useSavedPrimers"]').should("be.checked");
    cy.get('[data-cy="openSavedPrimersModal"]').click();

    cy.get('[data-cy="primers_modal"]').within(() => {
      cy.get(`[data-cy="saved_primer_0_${samplePrimer.region}"]`).click();

      cy.get('[data-cy="usingPrimersList"]').should(
        "contain",
        samplePrimer.region,
      );
      cy.get('[data-cy="deletedSavedPrimers"]').click();
      cy.get('[data-cy="deleteSavedPrimerConfirmationMessage"]').should(
        "not.be.empty",
      );
      cy.get('[data-cy="deletedSavedPrimers"]').click();
    });

    cy.reload();
    cy.get('[data-cy="noSavedPrimers"]').should("exist");
  });

  it("Toggle localStorage", () => {
    cy.window().then((win) => {
      win.localStorage.setItem(USE_SAVED_PRIMERS_KEY, "true");
      win.localStorage.setItem(
        STORAGE_SAVED_PRIMERS_KEY,
        JSON.stringify([samplePrimer]),
      );
    });

    cy.reload();
    cy.get('[data-cy="useSavedPrimers"]')
      .scrollIntoView()
      .should("be.checked")
      .uncheck();

    cy.on("window:confirm", () => true); // Auto-confirm
    cy.get('[data-cy="useSavedPrimers"]').should("not.be.checked");

    cy.window().then((win) => {
      expect(win.localStorage.getItem(USE_SAVED_PRIMERS_KEY)).to.be.null;
      expect(win.localStorage.getItem(STORAGE_SAVED_PRIMERS_KEY)).to.be.null;
    });
  });
});
