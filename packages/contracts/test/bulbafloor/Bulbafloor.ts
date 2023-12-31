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
    this.signers.feeRecipient = signers[1];
    this.signers.royaltyRecipient = signers[2];
    this.signers.buyer = signers[3];

    this.loadFixture = loadFixture;
  });

  describe("Bulbafloor", function () {
    beforeEach(async function () {
      const { bulbafloor, feeBasisPoints, feeRecipient, royaltyRecipient, buyer, Erc20, Erc721, Erc1155 } =
        await this.loadFixture(deployBulbafloorFixture);
      this.bulbafloor = bulbafloor;
      this.feeBasisPoints = feeBasisPoints;
      this.feeRecipient = feeRecipient;
      this.royaltyRecipient = royaltyRecipient;
      this.buyer = buyer;
      this.Erc20 = Erc20;
      this.Erc721 = Erc721;
      this.Erc1155 = Erc1155;
      this.denominator = await bulbafloor.DENOMINATOR();
    });

    shouldBehaveLikeBulbafloor();
  });
});
