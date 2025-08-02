export function waitForRequests(alias: string, count: number) {
  for (let i = 0; i < count; i++) {
    cy.wait(alias);
  }
}
