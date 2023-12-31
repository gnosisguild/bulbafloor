import { expect } from "chai";
import { log } from "console";
import hre, { ethers } from "hardhat";

function getBlockTimestamp(): Promise<number> {
  return hre.network.provider.send("eth_getBlockByNumber", ["latest", false]).then((x) => Number(x.timestamp));
}

async function calculatePriceAtTimestamp(
  timestamp: number,
  startPrice: number,
  duration: number,
  startTime: number,
): Promise<number> {
  const elapsedTime = timestamp - Number(startTime);
  const remainingTime = Number(duration) - elapsedTime;
  return (remainingTime * Number(startPrice)) / Number(duration);
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
      expect(await this.bulbafloor.feeCollector()).to.equal(this.signers.feeCollector.address);
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
      await hre.network.provider.send("evm_increaseTime", [
        ((Number(startPrice) - Number(reservePrice)) / Number(startPrice)) * Number(duration) + 1,
      ]);
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

  describe("setFeeCollector()", function () {
    it("should revert if called by account other than owner, feeCollector", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).setFeeCollector(this.signers.buyer.address)).to.be
        .reverted;
    });
    it("should revert if _feeCollector is equal to feeCollector", async function () {
      await expect(this.bulbafloor.setFeeCollector(this.signers.feeCollector.address))
        .to.be.revertedWithCustomError(this.bulbafloor, "FeeCollectorAlreadySetToThisAddress")
        .withArgs(this.signers.feeCollector.address);
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
        sold,
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

  describe.only("buy()", function () {
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
    it("should transfer the correct fee to feeCollector", async function () {
      await this.bulbafloor.connect(this.signers.buyer).buy(0);
      expect(await this.Erc20.balanceOf(this.signers.feeCollector.address)).to.equal(99);
    });
    it("should transfer the correct royalty to the royaltyRecipient", async function () {
      await this.bulbafloor.connect(this.signers.buyer).buy(0);
      expect(await this.Erc20.balanceOf(this.signers.royaltyRecipient.address)).to.equal(99);
    });
    it("should transfer the correct amount to the seller", async function () {
      const previousBalance: bigint = await this.Erc20.balanceOf(this.signers.admin.address);
      const [, , , , , , startPrice, , feeBasisPoints, , royaltyBasisPoints, duration, startTime] =
        await this.bulbafloor.getAuction(0);
      const [, currentPrice] = await this.bulbafloor.getCurrentPrice(0);
      const expectedPrice = await calculatePriceAtTimestamp(await getBlockTimestamp(), startPrice, duration, startTime);
      const fee = (currentPrice * feeBasisPoints) / this.denominator;
      const royalty = (currentPrice * royaltyBasisPoints) / this.denominator;
      const proceeds = currentPrice - fee - royalty;
      const expectedBalance = previousBalance + proceeds;
      log("previousBalance:", previousBalance);
      log("currentPrice:", currentPrice);
      log("expectedPrice:", expectedPrice);
      log("proceeds:", proceeds);
      log("expectedBalance:", expectedBalance);

      await this.bulbafloor.connect(this.signers.buyer).buy(0);

      const royaltyRecipientBalance = await this.Erc20.balanceOf(this.signers.royaltyRecipient.address);
      log("royaltyRecipientBalance:", royaltyRecipientBalance);
      const feeCollectorBalance = await this.Erc20.balanceOf(this.signers.feeCollector.address);
      log("feeCollectorBalance:", feeCollectorBalance);
      const totalFees = royaltyRecipientBalance + feeCollectorBalance;
      log("totalFees:", totalFees);

      expect(await this.Erc20.balanceOf(this.signers.admin.address)).to.equal(previousBalance + proceeds);
    });
    it("should transfer the NFT to the buyer", async function () {
      await this.bulbafloor.connect(this.signers.buyer).buy(0);
      expect(await this.Erc721.ownerOf(0)).to.equal(this.signers.buyer.address);

      await this.bulbafloor.connect(this.signers.buyer).buy(1);
      expect(await this.Erc1155.balanceOf(this.signers.buyer.address, 0)).to.equal(1);
    });
    it("should emit AuctionSuccessful() with correct parameters", async function () {
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
          9997,
        );

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
          9998,
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
    it("should transfer full native token balance to feeCollector", async function () {
      const amount = "0xfffffffffff";
      await hre.network.provider.send("hardhat_setBalance", [this.bulbafloor.target, amount]);
      const previousBalance: bigint = await ethers.provider.getBalance(this.signers.feeCollector.address);
      await this.bulbafloor.recoverNativeTokens();
      expect(await ethers.provider.getBalance(this.signers.feeCollector.address)).to.equal(
        previousBalance + BigInt(amount),
      );
    });
  });

  describe("recoverERC20tokens()", function () {
    it("should transfer full balance of given ERC20 tokens to feeCollector", async function () {
      const previousBalance: bigint = await this.Erc20.balanceOf(this.signers.feeCollector.address);
      const amount = 1000000n;
      await this.Erc20.transfer(this.bulbafloor.target, amount);
      await this.bulbafloor.recoverERC20tokens([this.Erc20.target]);
      expect(await this.Erc20.balanceOf(this.signers.feeCollector.address)).to.equal(previousBalance + amount);
    });
  });

  describe("recoverERC721tokens()", function () {
    it("should revert if called by account other than owner", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).recoverERC721tokens([this.Erc721.target], [0])).to.be
        .reverted;
    });
    it("should transfer given ERC721 tokens to feeCollector", async function () {
      const previousBalance: bigint = await this.Erc721.balanceOf(this.signers.feeCollector.address);
      await this.Erc721.safeMint(this.signers.admin.address, 2);
      await this.Erc721.safeTransferFrom(this.signers.admin.address, this.bulbafloor.target, 2);
      await this.bulbafloor.recoverERC721tokens([this.Erc721.target], [2]);
      expect(await this.Erc721.balanceOf(this.signers.feeCollector.address)).to.equal(previousBalance + 1n);
    });
  });

  describe("recoverERC1155tokens()", function () {
    it("should revert if called by account other than owner", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).recoverERC1155tokens([this.Erc1155.target], [0], [1])).to
        .be.reverted;
    });
    it("should transfer given ERC1155 tokens to feeCollector", async function () {
      const previousBalance: bigint = await this.Erc1155.balanceOf(this.signers.feeCollector.address, 0);
      await this.Erc1155.mintBatch(this.bulbafloor.target, [0], [1], "0x");
      await this.bulbafloor.recoverERC1155tokens([this.Erc1155.target], [0], [1]);
      expect(await this.Erc1155.balanceOf(this.signers.feeCollector.address, 0)).to.equal(previousBalance + 1n);
    });
  });
}
