import { expect } from "chai";
import { log } from "console";
import hre, { ethers } from "hardhat";

function getBlockTimestamp(): Promise<bigint> {
  return hre.network.provider.send("eth_getBlockByNumber", ["latest", false]).then((x) => BigInt(x.timestamp));
}

async function calculatePriceAtTimestamp(
  timestamp: bigint,
  startPrice: bigint,
  duration: bigint,
  startTime: bigint,
): Promise<bigint> {
  const elapsedTime = timestamp - startTime;
  const remainingTime = duration - elapsedTime;
  return (remainingTime * startPrice) / duration;
}

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
      expect(await this.bulbafloor.feeRecipient()).to.equal(this.signers.feeRecipient.address);
    });
  });

  describe("checkAuction()", function () {
    it("should revert if auction does not exist", async function () {
      await expect(this.bulbafloor.checkAuction(123456)).to.be.revertedWithCustomError(
        this.bulbafloor,
        "AuctionDoesNotExist",
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
      const timeIncrement: bigint =
        ((BigInt(startPrice) - BigInt(reservePrice)) * BigInt(duration)) / BigInt(startPrice) + 1n;
      await hre.network.provider.send("evm_increaseTime", [Number(timeIncrement.toString())]);
      await hre.network.provider.send("evm_mine");
      const [, currentPrice] = await this.bulbafloor.getCurrentPrice(0);
      expect(currentPrice).to.equal(reservePrice);
    });
    it("should return calculated current price if it is higher than reserve price", async function () {
      const [, , , , , , startPrice, , , , , duration, startTime] = await this.bulbafloor.getAuction(0);
      await hre.network.provider.send("evm_increaseTime", [Number(duration) / 2]);
      await hre.network.provider.send("evm_mine");
      const [, currentPrice] = await this.bulbafloor.getCurrentPrice(0);
      const expectedPrice = await calculatePriceAtTimestamp(await getBlockTimestamp(), startPrice, duration, startTime);
      expect(currentPrice).to.equal(expectedPrice);
    });
  });

  describe("setFeeBasisPoints()", function () {
    it("should revert if called by account other than owner", async function () {
      // await this.bulbafloor.connect(this.signers.buyer).setFeeBasisPoints(100);
      await expect(this.bulbafloor.connect(this.signers.buyer).setFeeBasisPoints(100)).to.be.reverted;
    });
    it("should revert if _feeBasisPoints is greater than DENOMINATOR", async function () {
      await expect(this.bulbafloor.setFeeBasisPoints(Number(this.denominator) + 1))
        .to.be.revertedWithCustomError(this.bulbafloor, "FeeBasisPointsGreaterThanDenominator")
        .withArgs(this.denominator, Number(this.denominator) + 1);
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

  describe("setFeeRecipient()", function () {
    it("should revert if called by account other than owner, feeRecipient", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).setFeeRecipient(this.signers.buyer.address)).to.be
        .reverted;
    });
    it("should revert if _feeRecipient is equal to feeRecipient", async function () {
      await expect(this.bulbafloor.setFeeRecipient(this.signers.feeRecipient.address))
        .to.be.revertedWithCustomError(this.bulbafloor, "FeeRecipientAlreadySetToThisAddress")
        .withArgs(this.signers.feeRecipient.address);
    });
    it("should set feeRecipient", async function () {
      const newFeeRecipient = this.signers.buyer.address;
      await this.bulbafloor.setFeeRecipient(newFeeRecipient);
      expect(await this.bulbafloor.feeRecipient()).to.equal(newFeeRecipient);
    });
    it("should should emit FeeRecipientSet() with correct parameters", async function () {
      const newFeeRecipient = this.signers.buyer.address;
      await expect(this.bulbafloor.setFeeRecipient(newFeeRecipient))
        .to.emit(this.bulbafloor, "FeeRecipientSet")
        .withArgs(newFeeRecipient);
    });
  });

  describe("createAuction()", function () {
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
          Number(this.denominator) - Number(this.feeBasisPoints) + 1,
          10000,
        ),
      )
        .to.be.revertedWithCustomError(this.bulbafloor, "RoyaltyBasisPointsPlusFeeBasisPointsGreaterThanDenominator")
        .withArgs(
          this.denominator,
          await this.bulbafloor.feeBasisPoints(),
          Number(this.denominator) - Number(this.feeBasisPoints) + 1,
        );
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
      ] = await this.bulbafloor.getAuction(1);
      expect(tokenContract).to.equal(this.Erc1155.target);
      expect(tokenId).to.equal(0);
      expect(tokenType).to.equal(1);
      expect(amount).to.equal(1);
      expect(saleToken).to.equal(this.Erc20.target);
      expect(seller).to.equal(this.signers.admin.address);
      expect(startPrice).to.equal(10000);
      expect(reservePrice).to.equal(250);
      expect(feeBasisPoints).to.equal(this.feeBasisPoints);
      expect(royaltyRecipient).to.equal(this.signers.royaltyRecipient.address);
      expect(royaltyBasisPoints).to.equal(100);
      expect(duration).to.equal(10000);
      expect(startTime).to.equal(await getBlockTimestamp());
    });
    it("should return new auctionId", async function () {
      const expectedNextAuctionId = await this.bulbafloor.nextAuctionId();
      await this.Erc721.approve(this.bulbafloor.target, 1);
      const nextAuctionId = await this.bulbafloor.createAuction.staticCall(
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
      expect(nextAuctionId).to.equal(expectedNextAuctionId);
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

      await this.Erc1155.setApprovalForAll(this.bulbafloor.target, true);
      await this.bulbafloor.createAuction(
        this.Erc1155.target,
        1,
        1,
        1,
        this.Erc20.target,
        10000,
        250,
        this.signers.royaltyRecipient.address,
        100,
        10000,
      );
      expect(await this.Erc1155.balanceOf(this.bulbafloor.target, 0)).to.equal(1);
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
        .withArgs(2, this.Erc721.target, 1, 0, this.Erc20.target, this.signers.admin.address, 10000, 250, 10000);

      await expect(
        this.bulbafloor.createAuction(
          this.Erc1155.target,
          1,
          1,
          1,
          this.Erc20.target,
          10000,
          250,
          this.signers.royaltyRecipient.address,
          100,
          10000,
        ),
      )
        .to.emit(this.bulbafloor, "AuctionCreated")
        .withArgs(3, this.Erc1155.target, 1, 1, this.Erc20.target, this.signers.admin.address, 10000, 250, 10000);
    });
  });

  describe("buy()", function () {
    it("should revert if item has already sold", async function () {
      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      await expect(this.bulbafloor.connect(this.signers.buyer).buy(0))
        .to.be.revertedWithCustomError(this.bulbafloor, "AuctionDoesNotExist")
        .withArgs(0);
    });
    it("should delete auction from storage", async function () {
      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      await expect(this.bulbafloor.checkAuction(0))
        .to.be.revertedWithCustomError(this.bulbafloor, "AuctionDoesNotExist")
        .withArgs(0);
    });
    it("should transfer the correct fee to feeRecipient", async function () {
      const [, , , , , , startPrice, , feeBasisPoints, , , duration, startTime] = await this.bulbafloor.getAuction(0);
      const nextBlockTimestamp: bigint = BigInt(await getBlockTimestamp()) + 1n;
      const expectedPrice: bigint = BigInt(
        await calculatePriceAtTimestamp(nextBlockTimestamp, startPrice, duration, startTime),
      );
      const fee = (expectedPrice * feeBasisPoints) / this.denominator;

      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      expect(await this.Erc20.balanceOf(this.signers.feeRecipient.address)).to.equal(fee);
    });
    it("should transfer the correct royalty to the royaltyRecipient", async function () {
      const [, , , , , , startPrice, , , , royaltyBasisPoints, duration, startTime] =
        await this.bulbafloor.getAuction(0);
      const nextBlockTimestamp: bigint = BigInt(await getBlockTimestamp()) + 1n;
      const expectedPrice: bigint = BigInt(
        await calculatePriceAtTimestamp(nextBlockTimestamp, startPrice, duration, startTime),
      );
      const royalty = (expectedPrice * royaltyBasisPoints) / this.denominator;

      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      expect(await this.Erc20.balanceOf(this.signers.royaltyRecipient.address)).to.equal(royalty);
    });
    it("should transfer the correct amount to the seller", async function () {
      const previousBalance: bigint = await this.Erc20.balanceOf(this.signers.admin.address);
      const [, , , , , , startPrice, , feeBasisPoints, , royaltyBasisPoints, duration, startTime] =
        await this.bulbafloor.getAuction(0);
      const nextBlockTimestamp: bigint = BigInt(await getBlockTimestamp()) + 1n;
      const expectedPrice: bigint = BigInt(
        await calculatePriceAtTimestamp(nextBlockTimestamp, startPrice, duration, startTime),
      );
      const fee = (expectedPrice * feeBasisPoints) / this.denominator;
      const royalty = (expectedPrice * royaltyBasisPoints) / this.denominator;
      const proceeds = expectedPrice - fee - royalty;

      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      expect(await this.Erc20.balanceOf(this.signers.admin.address)).to.equal(previousBalance + proceeds);
      expect(await this.Erc20.balanceOf(this.signers.feeRecipient.address)).to.equal(fee);
      expect(await this.Erc20.balanceOf(this.signers.royaltyRecipient.address)).to.equal(royalty);
    });
    it("should transfer the NFT to the buyer", async function () {
      await this.bulbafloor.connect(this.signers.buyer).buy(0);
      expect(await this.Erc721.ownerOf(0)).to.equal(this.signers.buyer.address);

      await this.bulbafloor.connect(this.signers.buyer).buy(1);
      expect(await this.Erc1155.balanceOf(this.signers.buyer.address, 0)).to.equal(1);
    });
    it("should emit AuctionSuccessful() with correct parameters", async function () {
      let [, , , , , , startPrice, , , , , duration, startTime] = await this.bulbafloor.getAuction(0);
      let nextBlockTimestamp: bigint = BigInt(await getBlockTimestamp()) + 1n;
      let expectedPrice: bigint = BigInt(
        await calculatePriceAtTimestamp(nextBlockTimestamp, startPrice, duration, startTime),
      );
      await expect(this.bulbafloor.connect(this.signers.buyer).buy(0))
        .to.emit(this.bulbafloor, "AuctionSuccessful")
        .withArgs(
          0,
          this.signers.admin.address,
          this.signers.buyer.address,
          this.Erc721.target,
          0,
          1,
          this.Erc20.target,
          expectedPrice,
        );

      [, , , , , , startPrice, , , , , duration, startTime] = await this.bulbafloor.getAuction(1);
      nextBlockTimestamp = BigInt(await getBlockTimestamp()) + 1n;
      expectedPrice = BigInt(await calculatePriceAtTimestamp(nextBlockTimestamp, startPrice, duration, startTime));
      await expect(this.bulbafloor.connect(this.signers.buyer).buy(1))
        .to.emit(this.bulbafloor, "AuctionSuccessful")
        .withArgs(
          1,
          this.signers.admin.address,
          this.signers.buyer.address,
          this.Erc1155.target,
          0,
          1,
          this.Erc20.target,
          expectedPrice,
        );
    });
  });

  describe("cancelAuction()", function () {
    it("should revert if item has already sold", async function () {
      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      await expect(this.bulbafloor.connect(this.signers.admin).cancelAuction(0))
        .to.be.revertedWithCustomError(this.bulbafloor, "AuctionDoesNotExist")
        .withArgs(0);
    });
    it("should revert if called by account other than seller", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).cancelAuction(0)).to.be.reverted;
    });
    it("should delete auction from storage", async function () {
      await this.bulbafloor.connect(this.signers.admin).cancelAuction(0);
      await expect(this.bulbafloor.checkAuction(0))
        .to.be.revertedWithCustomError(this.bulbafloor, "AuctionDoesNotExist")
        .withArgs(0);
    });
    it("should transfer NFT to seller", async function () {
      await this.bulbafloor.connect(this.signers.admin).cancelAuction(0);
      expect(await this.Erc721.ownerOf(0)).to.equal(this.signers.admin.address);
      await this.bulbafloor.connect(this.signers.admin).cancelAuction(1);
      expect(await this.Erc1155.balanceOf(this.signers.admin.address, 0)).to.equal(1);
    });
    it("should emit AuctionCancelled() with correct parameters", async function () {
      await expect(this.bulbafloor.connect(this.signers.admin).cancelAuction(0))
        .to.emit(this.bulbafloor, "AuctionCancelled")
        .withArgs(0, this.signers.admin.address, this.Erc721.target, 0);
    });
  });

  describe("recoverNativeTokens()", function () {
    it("should transfer full native token balance to feeRecipient", async function () {
      const amount = "0xfffffffffff";
      await hre.network.provider.send("hardhat_setBalance", [this.bulbafloor.target, amount]);
      const previousBalance: bigint = await ethers.provider.getBalance(this.signers.feeRecipient.address);
      await this.bulbafloor.recoverNativeTokens();
      expect(await ethers.provider.getBalance(this.signers.feeRecipient.address)).to.equal(
        previousBalance + BigInt(amount),
      );
    });
  });

  describe("recoverERC20tokens()", function () {
    it("should transfer full balance of given ERC20 tokens to feeRecipient", async function () {
      const previousBalance: bigint = await this.Erc20.balanceOf(this.signers.feeRecipient.address);
      const amount = 1000000n;
      await this.Erc20.transfer(this.bulbafloor.target, amount);
      await this.bulbafloor.recoverERC20tokens([this.Erc20.target]);
      expect(await this.Erc20.balanceOf(this.signers.feeRecipient.address)).to.equal(previousBalance + amount);
    });
  });

  describe("recoverERC721tokens()", function () {
    it("should revert if called by account other than owner", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).recoverERC721tokens([this.Erc721.target], [0])).to.be
        .reverted;
    });
    it("should transfer given ERC721 tokens to feeRecipient", async function () {
      const previousBalance: bigint = await this.Erc721.balanceOf(this.signers.feeRecipient.address);
      await this.Erc721.safeMint(this.signers.admin.address, 2);
      await this.Erc721.safeTransferFrom(this.signers.admin.address, this.bulbafloor.target, 2);
      await this.bulbafloor.recoverERC721tokens([this.Erc721.target], [2]);
      expect(await this.Erc721.balanceOf(this.signers.feeRecipient.address)).to.equal(previousBalance + 1n);
    });
  });

  describe("recoverERC1155tokens()", function () {
    it("should revert if called by account other than owner", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).recoverERC1155tokens([this.Erc1155.target], [0], [1])).to
        .be.reverted;
    });
    it("should transfer given ERC1155 tokens to feeRecipient", async function () {
      const previousBalance: bigint = await this.Erc1155.balanceOf(this.signers.feeRecipient.address, 0);
      await this.Erc1155.mintBatch(this.bulbafloor.target, [0], [1], "0x");
      await this.bulbafloor.recoverERC1155tokens([this.Erc1155.target], [0], [1]);
      expect(await this.Erc1155.balanceOf(this.signers.feeRecipient.address, 0)).to.equal(previousBalance + 1n);
    });
  });
}
