export function createPipelineVerifier(route: string, listEndpoint: string) {
  const alias = "pipelineSubmit";

  cy.intercept("POST", route).as(alias);

  return () => {
    cy.wait(`@${alias}`).then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      const responseData = interception.response?.body;

      const id = responseData.id;

      cy.request(listEndpoint).then((response) => {
        expect(response.status).to.eq(200);
        cy.log("RESPONSE", response.body);
        const match = response.body.find((obj) => obj.id === id);
        expect(match).to.not.be.undefined;
      });
    });
  };
}
