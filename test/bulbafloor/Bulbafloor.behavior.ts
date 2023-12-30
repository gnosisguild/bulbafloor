import { expect } from "chai";
import hre from "hardhat";

export function shouldBehaveLikeBulbafloor(): void {
  describe("constructor", function () {
    it("should deploy", async function () {
      expect(await this.bulbafloor.owner()).to.equal(this.signers.admin.address);
    });
  });

  describe("initialize()", function () {
    it("should correctly initialize parameters", async function () {
      expect(await this.bulbafloor.owner()).to.equal(this.signers.admin.address);
      expect(await this.bulbafloor.feeBasisPoints()).to.equal(this.feeBasisPoints);
      expect(await this.bulbafloor.feeCollector()).to.equal(this.signers.feeCollector.address);
    });
  });

  describe("checkAuction()", function () {
    it("should revert if auction does not exist", async function () {
      await expect(this.bulbafloor.checkAuction(1)).to.be.revertedWithCustomError(
        this.bulbafloor,
        "AuctionDoesNotExist()",
      );
    });
    it("should return correct auction", async function () {
      expect(await this.bulbafloor.checkAuction(0)).to.equal(0);
    });
  });

  describe("getCurrentPrice()", function () {
    it("should return reserve price if elapsed time exceeds duration", async function () {
      const [, , , , , , , reservePrice, , , , duration] = await this.bulbafloor.getAuction(0);
      await hre.network.provider.send("evm_increaseTime", [Number(duration) + 1]);
      await hre.network.provider.send("evm_mine");
      const [, currentPrice] = await this.bulbafloor.getCurrentPrice(0);
      expect(currentPrice).to.equal(reservePrice);
    });
    it("should return reserve price if calculated current price is lower than reserve price", async function () {
      const [, , , , , , startPrice, reservePrice, , , , duration] = await this.bulbafloor.getAuction(0);
      await hre.network.provider.send("evm_increaseTime", [
        ((Number(startPrice) - Number(reservePrice)) / Number(startPrice)) * Number(duration) + 1,
      ]);
      await hre.network.provider.send("evm_mine");
      const [, currentPrice] = await this.bulbafloor.getCurrentPrice(0);
      expect(currentPrice).to.equal(reservePrice);
    });
    it("should return calculated current price if it is higher than reserve price", async function () {
      const [, , , , , , startPrice, , , , , duration] = await this.bulbafloor.getAuction(0);
      await hre.network.provider.send("evm_increaseTime", [Number(duration) / 2]);
      await hre.network.provider.send("evm_mine");
      const [, currentPrice] = await this.bulbafloor.getCurrentPrice(0);
      expect(currentPrice).to.equal(startPrice / 2n);
    });
  });

  describe("setFeeBasisPoints()", function () {
    it("should revert if called by account other than owner", async function () {
      // await this.bulbafloor.connect(this.signers.buyer).setFeeBasisPoints(100);
      await expect(this.bulbafloor.connect(this.signers.buyer).setFeeBasisPoints(100)).to.be.reverted;
    });
    it("should revert if _feeBasisPoints is greater than DENOMINATOR", async function () {
      const denominator = await this.bulbafloor.DENOMINATOR();
      await expect(this.bulbafloor.setFeeBasisPoints(Number(denominator) + 1)).to.be.revertedWithCustomError(
        this.bulbafloor,
        "FeeBasisPointsGreaterThanDenominator()",
      );
    });
    it("should set feeBasisPoints", async function () {
      const newFeeBasisPoints = 100;
      await this.bulbafloor.setFeeBasisPoints(newFeeBasisPoints);
      expect(await this.bulbafloor.feeBasisPoints()).to.equal(newFeeBasisPoints);
    });
    it("should should emit FeeBasisPoints() with correct parameters", async function () {
      const newFeeBasisPoints = 100;
      await expect(this.bulbafloor.setFeeBasisPoints(newFeeBasisPoints))
        .to.emit(this.bulbafloor, "FeeBasisPointsSet")
        .withArgs(newFeeBasisPoints);
    });
  });

  describe("setFeeCollector()", function () {
    it("should revert if called by account other than owner, feeCollector", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).setFeeCollector(this.signers.buyer.address)).to.be
        .reverted;
    });
    it("should revert if _feeCollector is equal to feeCollector", async function () {
      await expect(this.bulbafloor.setFeeCollector(this.signers.feeCollector.address)).to.be.revertedWithCustomError(
        this.bulbafloor,
        "FeeCollectorAlreadySetToThisAddress()",
      );
    });
    it("should set feeCollector", async function () {
      const newFeeCollector = this.signers.buyer.address;
      await this.bulbafloor.setFeeCollector(newFeeCollector);
      expect(await this.bulbafloor.feeCollector()).to.equal(newFeeCollector);
    });
    it("should should emit FeeCollectorSet() with correct parameters", async function () {
      const newFeeCollector = this.signers.buyer.address;
      await expect(this.bulbafloor.setFeeCollector(newFeeCollector))
        .to.emit(this.bulbafloor, "FeeCollectorSet")
        .withArgs(newFeeCollector);
    });
  });

  describe.only("createAuction()", function () {
    it("should revert if duration is equal to 0", async function () {
      await expect(
        this.bulbafloor.createAuction(
          this.Erc721.target,
          0,
          0,
          0,
          this.Erc20.target,
          10000,
          250,
          this.signers.royaltyRecipient.address,
          100,
          0,
        ),
      ).to.be.revertedWithCustomError(this.bulbafloor, "DurationCannotBeZero()");
    });
    it("should revert if royaltyBasisPoints + feeBasisPoints is greater than DENOMINATOR", async function () {
      const denominator = await this.bulbafloor.DENOMINATOR();
      await this.Erc721.approve(this.bulbafloor.target, 1);
      await expect(
        this.bulbafloor.createAuction(
          this.Erc721.target,
          1,
          0,
          0,
          this.Erc20.target,
          10000,
          250,
          this.signers.royaltyRecipient.address,
          Number(denominator) - Number(this.feeBasisPoints) + 1,
          10000,
        ),
      ).to.be.revertedWithCustomError(this.bulbafloor, "RoyaltyBasisPointsPlusFeeBasisPointsGreaterThanDenominator()");
    });
    it("should increment nextAuctionId", async function () {
      const nextAuctionId = await this.bulbafloor.nextAuctionId();
      await this.Erc721.approve(this.bulbafloor.target, 1);
      await this.bulbafloor.createAuction(
        this.Erc721.target,
        1,
        0,
        0,
        this.Erc20.target,
        10000,
        250,
        this.signers.royaltyRecipient.address,
        100,
        10000,
      );
      expect(await this.bulbafloor.nextAuctionId()).to.equal(Number(nextAuctionId) + 1);
    });
    it("should create a new auction with correct parameters", async function () {
      const [
        tokenContract,
        tokenId,
        tokenType,
        amount,
        saleToken,
        seller,
        startPrice,
        reservePrice,
        feeBasisPoints,
        royaltyRecipient,
        royaltyBasisPoints,
        duration,
        startTime,
        sold,
      ] = await this.bulbafloor.getAuction(0);
      const timestamp = await hre.network.provider
        .send("eth_getBlockByNumber", ["latest", false])
        .then((x: any) => x.timestamp);

      expect(tokenContract).to.equal(this.Erc721.target);
      expect(tokenId).to.equal(0);
      expect(tokenType).to.equal(0);
      expect(amount).to.equal(0);
      expect(saleToken).to.equal(this.Erc20.target);
      expect(seller).to.equal(this.signers.admin.address);
      expect(startPrice).to.equal(10000);
      expect(reservePrice).to.equal(250);
      expect(feeBasisPoints).to.equal(this.feeBasisPoints);
      expect(royaltyRecipient).to.equal(this.signers.royaltyRecipient.address);
      expect(royaltyBasisPoints).to.equal(100);
      expect(duration).to.equal(10000);
      expect(startTime).to.equal(timestamp);
      expect(sold).to.equal(false);
    });
    it("should transfer NFT to Bulbafloor contract", async function () {
      await this.Erc721.approve(this.bulbafloor.target, 1);
      await this.bulbafloor.createAuction(
        this.Erc721.target,
        1,
        0,
        0,
        this.Erc20.target,
        10000,
        250,
        this.signers.royaltyRecipient.address,
        100,
        10000,
      );
      expect(await this.Erc721.ownerOf(1)).to.equal(this.bulbafloor.target);
    });
    it("should should emit AuctionCreated() with correct parameters", async function () {
      await this.Erc721.approve(this.bulbafloor.target, 1);
      await expect(
        this.bulbafloor.createAuction(
          this.Erc721.target,
          1,
          0,
          0,
          this.Erc20.target,
          10000,
          250,
          this.signers.royaltyRecipient.address,
          100,
          10000,
        ),
      )
        .to.emit(this.bulbafloor, "AuctionCreated")
        .withArgs(1, this.Erc721.target, 1, 0, this.Erc20.target, this.signers.admin.address, 10000, 250, 10000);
    });
  });

  describe("buy()", function () {
    it("should revert if item has already sold");
    it("should revert if item has already sold");
    it("should delete auction from storage");
    it("should transfer the correct fee to feeCollector");
    it("should transfer the correct royalty to the royaltyRecipient");
    it("should transfer the correct amount to the seller");
    it("should transfer the NFT to the buyer");
    it("should emit AuctionSuccessful() with correct parameters");
  });

  describe("cancelAuction()", function () {
    it("should revert if item has already sold");
    it("should revert if called by account other than seller");
    it("should delete auction from storage");
    it("should transfer NFT to seller");
    it("should emit AuctionCancelled() with correct parameters");
  });

  describe("recoverNativeTokens()", function () {
    it("should transfer full native token balance to feeCollector");
  });

  describe("recoverERC20tokens()", function () {
    it("should transfer full balance of given ERC20 tokens to feeCollector");
  });

  describe("recoverERC721tokens()", function () {
    it("should revert if called by account other than owner");
    it("should transfer given ERC721 tokens to feeCollector");
  });

  describe("recoverERC721tokens()", function () {
    it("should revert if called by account other than owner");
    it("should transfer given ERC721 tokens to feeCollector");
  });

  describe("recoverERC721tokens()", function () {
    it("should revert if called by account other than owner");
    it("should transfer given ERC1155 tokens to feeCollector");
  });
}
