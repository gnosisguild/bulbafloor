import { expect } from "chai";

export function shouldBehaveLikeBulbafloor(): void {
  describe("constructor", function () {
    it("should deploy");
  });

  describe("initialize()", function () {
    it("should correctly initialize parameters");
  });

  describe("checkAuction()", function () {
    it("should revert if auction does not exist");
    it("should return correct auction");
  });

  describe("getCurrentPrice()", function () {
    it("should return reserve price if elapsed time exceeds duration");
    it("should return reserve price if calculated current price is lower than reserve price");
    it("should return calculated current price if it is higher than reserve price");
  });

  describe("setFeeBasisPoints()", function () {
    it("should revert if called by account other than owner");
    it("should revert if _feeBasisPoints is greater than DENOMINATOR");
    it("should set feeBasisPoints");
    it("should should emit FeeBasisPoints() with correct parameters");
  });

  describe("setFeeCollector()", function () {
    it("should revert if called by account other than owner");
    it("should revert if _feeCollector is equal to feeCollector");
    it("should set feeCollector");
    it("should should emit FeeCollectorSet() with correct parameters");
  });

  describe("createAuction()", function () {
    it("should revert if duration is equal to 0");
    it("should revert if royaltyBasisPoints + feeBasisPoints is greater than DENOMINATOR");
    it("should increment nextAuctionId");
    it("should create a new auction with correct parameters");
    it("should transfer NFT to Bulbafloor contract");
    it("should should emit AuctionCreated() with correct parameters");
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
