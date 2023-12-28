import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

import type { Signers } from "../types";
import { shouldBehaveLikeBulbafloor } from "./Bulbafloor.behavior";
import { deployBulbafloorFixture } from "./Bulbafloor.fixture";

describe("Unit tests", function () {
  before(async function () {
    this.signers = {} as Signers;

    const signers = await ethers.getSigners();
    this.signers.admin = signers[0];

    this.loadFixture = loadFixture;
  });

  describe("Bulbafloor", function () {
    beforeEach(async function () {
      const { bulbafloor } = await this.loadFixture(deployBulbafloorFixture);
      this.bulbafloor = bulbafloor;
    });

    shouldBehaveLikeBulbafloor();
  });
});
