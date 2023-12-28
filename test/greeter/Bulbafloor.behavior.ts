import { expect } from "chai";

export function shouldBehaveLikeBulbafloor(): void {
  it("should return the new greeting once it's changed", async function () {
    expect(await this.bulbafloor.connect(this.signers.admin).greet()).to.equal("Hello, world!");

    await this.bulbafloor.setGreeting("Bonjour, le monde!");
    expect(await this.bulbafloor.connect(this.signers.admin).greet()).to.equal("Bonjour, le monde!");
  });
}
