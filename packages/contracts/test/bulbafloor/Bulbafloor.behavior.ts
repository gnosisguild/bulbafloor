import { expect } from "chai";
import { EventLog, Log } from "ethers";
import hre, { ethers } from "hardhat";

function getBlockTimestamp(block: string = "latest"): Promise<bigint> {
  return hre.network.provider.send("eth_getBlockByNumber", [block, false]).then((x) => BigInt(x.timestamp));
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
    it("deploys", async function () {
      expect(await this.bulbafloor.owner()).to.equal(this.signers.admin.address);
    });
  });

  describe("initialize()", function () {
    it("correctlys initialize parameters", async function () {
      expect(await this.bulbafloor.owner()).to.equal(this.signers.admin.address);
      expect(await this.bulbafloor.feeBasisPoints()).to.equal(this.feeBasisPoints);
      expect(await this.bulbafloor.feeRecipient()).to.equal(this.signers.feeRecipient.address);
    });
    it("reverts if already initialized", async function () {
      await expect(this.bulbafloor.initialize(this.signers.admin.address, 100, this.signers.feeRecipient.address)).to.be
        .reverted;
    });
  });

  describe("checkAuction()", function () {
    it("reverts if auction does not exist", async function () {
      await expect(this.bulbafloor.checkAuction(123456)).to.be.revertedWithCustomError(
        this.bulbafloor,
        "AuctionDoesNotExist",
      );
    });
    it("returns correct auction", async function () {
      expect(await this.bulbafloor.checkAuction(0)).to.equal(0);
    });
  });

  describe("getCurrentPrice()", function () {
    it("returns reserve price if elapsed time exceeds duration", async function () {
      const [, , , , , reservePrice, , , , duration] = await this.bulbafloor.getAuction(0);
      await hre.network.provider.send("evm_increaseTime", [Number(duration) + 1]);
      await hre.network.provider.send("evm_mine");
      const [, currentPrice] = await this.bulbafloor.getCurrentPrice(0);
      expect(currentPrice).to.equal(reservePrice);
    });
    it("returns reserve price if calculated current price is lower than reserve price", async function () {
      const [, , , , startPrice, reservePrice, , , , duration] = await this.bulbafloor.getAuction(0);
      const timeIncrement: bigint =
        ((BigInt(startPrice) - BigInt(reservePrice)) * BigInt(duration)) / BigInt(startPrice) + 1n;
      await hre.network.provider.send("evm_increaseTime", [Number(timeIncrement.toString())]);
      await hre.network.provider.send("evm_mine");
      const [, currentPrice] = await this.bulbafloor.getCurrentPrice(0);
      expect(currentPrice).to.equal(reservePrice);
    });
    it("returns calculated current price if it is higher than reserve price", async function () {
      const [, , , , startPrice, , , , , duration, startTime] = await this.bulbafloor.getAuction(0);
      await hre.network.provider.send("evm_increaseTime", [Number(duration) / 2]);
      await hre.network.provider.send("evm_mine");
      const [, currentPrice] = await this.bulbafloor.getCurrentPrice(0);
      const expectedPrice = await calculatePriceAtTimestamp(await getBlockTimestamp(), startPrice, duration, startTime);
      expect(currentPrice).to.equal(expectedPrice);
    });
  });

  describe("setFeeBasisPoints()", function () {
    it("reverts if called by account other than owner", async function () {
      // await this.bulbafloor.connect(this.signers.buyer).setFeeBasisPoints(100);
      await expect(this.bulbafloor.connect(this.signers.buyer).setFeeBasisPoints(100)).to.be.reverted;
    });
    it("reverts if _feeBasisPoints is greater than DENOMINATOR", async function () {
      await expect(this.bulbafloor.setFeeBasisPoints(Number(this.denominator) + 1))
        .to.be.revertedWithCustomError(this.bulbafloor, "FeeBasisPointsGreaterThanDenominator")
        .withArgs(this.denominator, Number(this.denominator) + 1);
    });
    it("sets feeBasisPoints", async function () {
      const newFeeBasisPoints = 100;
      await this.bulbafloor.setFeeBasisPoints(newFeeBasisPoints);
      expect(await this.bulbafloor.feeBasisPoints()).to.equal(newFeeBasisPoints);
    });
    it("emits FeeBasisPoints() with correct parameters", async function () {
      const newFeeBasisPoints = 100;
      await expect(this.bulbafloor.setFeeBasisPoints(newFeeBasisPoints))
        .to.emit(this.bulbafloor, "FeeBasisPointsSet")
        .withArgs(newFeeBasisPoints);
    });
  });

  describe("setFeeRecipient()", function () {
    it("reverts if called by account other than owner, feeRecipient", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).setFeeRecipient(this.signers.buyer.address)).to.be
        .reverted;
    });
    it("reverts if _feeRecipient is equal to feeRecipient", async function () {
      await expect(this.bulbafloor.setFeeRecipient(this.signers.feeRecipient.address))
        .to.be.revertedWithCustomError(this.bulbafloor, "FeeRecipientAlreadySetToThisAddress")
        .withArgs(this.signers.feeRecipient.address);
    });
    it("sets feeRecipient", async function () {
      const newFeeRecipient = this.signers.buyer.address;
      await this.bulbafloor.setFeeRecipient(newFeeRecipient);
      expect(await this.bulbafloor.feeRecipient()).to.equal(newFeeRecipient);
    });
    it("emits FeeRecipientSet() with correct parameters", async function () {
      const newFeeRecipient = this.signers.buyer.address;
      await expect(this.bulbafloor.setFeeRecipient(newFeeRecipient))
        .to.emit(this.bulbafloor, "FeeRecipientSet")
        .withArgs(newFeeRecipient);
    });
  });

  describe("createAuction()", function () {
    it("reverts if duration is equal to 0", async function () {
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
    it("reverts if royaltyBasisPoints + feeBasisPoints is greater than DENOMINATOR", async function () {
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
    it("increments nextAuctionId", async function () {
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
    it("creates a new auction with correct parameters", async function () {
      const [
        token,
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
      expect(token).to.deep.equal([this.Erc1155.target, 0n, 1n]);
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
    it("returns new auctionId", async function () {
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
    it("transfers NFT to Bulbafloor contract", async function () {
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
    it("emits AuctionCreated() with correct parameters", async function () {
      // ERC721
      const erc721Auction = {
        token: {
          tokenContract: this.Erc721.target,
          tokenId: 1n,
          tokenType: 0n,
        },
        amount: 1n,
        saleToken: this.Erc20.target,
        seller: this.signers.admin.address,
        startPrice: 10000n,
        reservePrice: 250n,
        feeRecipient: this.signers.feeRecipient.address,
        feeBasisPoints: this.feeBasisPoints,
        royaltyRecipient: this.signers.royaltyRecipient.address,
        royaltyBasisPoints: 100n,
        duration: 10000n,
        startTime: 0n,
      };

      await this.Erc721.approve(this.bulbafloor.target, 1);

      const erc721CreateAuctionTx = await this.bulbafloor.createAuction(
        erc721Auction.token.tokenContract,
        erc721Auction.token.tokenId,
        erc721Auction.token.tokenType,
        erc721Auction.amount,
        erc721Auction.saleToken,
        erc721Auction.startPrice,
        erc721Auction.reservePrice,
        erc721Auction.royaltyRecipient,
        erc721Auction.royaltyBasisPoints,
        erc721Auction.duration,
      );

      const erc721Receipt = await erc721CreateAuctionTx.wait();

      const auctionCreatedEvent = this.bulbafloor.interface.getEvent("AuctionCreated");
      const erc721EventLog = erc721Receipt?.logs.find((log) => log.topics[0] === auctionCreatedEvent.topicHash) as Log;

      if (!erc721EventLog) {
        throw new Error("AuctionCreated event not found");
      }

      const parsedErc721Log = this.bulbafloor.interface.parseLog({
        topics: Array.from(erc721EventLog.topics),
        data: erc721EventLog.data,
      });

      erc721Auction.startTime = await getBlockTimestamp();
      const erc721AuctionAsArray = Object.values(erc721Auction);
      erc721AuctionAsArray[0] = Object.values(erc721AuctionAsArray[0]);

      expect(parsedErc721Log?.args).to.deep.equal([
        2n,
        erc721AuctionAsArray,
        this.signers.admin.address,
        erc721Auction.token.tokenContract,
      ]);

      // ERC1155

      const erc1155Auction = {
        token: {
          tokenContract: this.Erc1155.target,
          tokenId: 1n,
          tokenType: 1n,
        },
        amount: 1n,
        saleToken: this.Erc20.target,
        seller: this.signers.admin.address,
        startPrice: 10000n,
        reservePrice: 250n,
        feeRecipient: this.signers.feeRecipient.address,
        feeBasisPoints: this.feeBasisPoints,
        royaltyRecipient: this.signers.royaltyRecipient.address,
        royaltyBasisPoints: 100n,
        duration: 10000n,
        startTime: 0n,
      };

      await this.Erc1155.setApprovalForAll(this.bulbafloor.target, true);
      const erc1155CreateAuctionTx = await this.bulbafloor.createAuction(
        erc1155Auction.token.tokenContract,
        erc1155Auction.token.tokenId,
        erc1155Auction.token.tokenType,
        erc1155Auction.amount,
        erc1155Auction.saleToken,
        erc1155Auction.startPrice,
        erc1155Auction.reservePrice,
        erc1155Auction.royaltyRecipient,
        erc1155Auction.royaltyBasisPoints,
        erc1155Auction.duration,
      );
      const erc1155Receipt = await erc1155CreateAuctionTx.wait();
      const erc1155EventLog = erc1155Receipt?.logs.find(
        (log) => log.topics[0] === auctionCreatedEvent.topicHash,
      ) as Log;

      if (!erc1155EventLog) {
        throw new Error("AuctionCreated event not found");
      }

      const parsedErc1155Log = this.bulbafloor.interface.parseLog({
        topics: Array.from(erc1155EventLog.topics),
        data: erc1155EventLog.data,
      });

      erc1155Auction.startTime = await getBlockTimestamp();
      const erc1155AuctionAsArray = Object.values(erc1155Auction);
      erc1155AuctionAsArray[0] = Object.values(erc1155AuctionAsArray[0]);

      expect(parsedErc1155Log?.args).to.deep.equal([
        3n,
        erc1155AuctionAsArray,
        this.signers.admin.address,
        erc1155Auction.token.tokenContract,
      ]);
    });
  });

  describe("buy()", function () {
    it("reverts if item has already sold", async function () {
      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      await expect(this.bulbafloor.connect(this.signers.buyer).buy(0))
        .to.be.revertedWithCustomError(this.bulbafloor, "AuctionDoesNotExist")
        .withArgs(0);
    });
    it("deletes auction from storage", async function () {
      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      await expect(this.bulbafloor.checkAuction(0))
        .to.be.revertedWithCustomError(this.bulbafloor, "AuctionDoesNotExist")
        .withArgs(0);
    });
    it("transfers the correct fee to feeRecipient", async function () {
      const [, , , , startPrice, , feeBasisPoints, , , duration, startTime] = await this.bulbafloor.getAuction(0);

      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));

      const blockTimestamp: bigint = BigInt(await getBlockTimestamp());
      const expectedPrice: bigint = BigInt(
        await calculatePriceAtTimestamp(blockTimestamp, startPrice, duration, startTime),
      );
      const fee = (expectedPrice * feeBasisPoints) / this.denominator;

      expect(await this.Erc20.balanceOf(this.signers.feeRecipient.address)).to.equal(fee);
    });
    it("transfers the correct royalty to the royaltyRecipient", async function () {
      const [, , , , startPrice, , , , royaltyBasisPoints, duration, startTime] = await this.bulbafloor.getAuction(0);
      await this.bulbafloor.connect(this.signers.buyer).buy(0);
      const blockTimestamp: bigint = await getBlockTimestamp(); //BigInt(x.timestamp)
      const expectedPrice: bigint = BigInt(
        await calculatePriceAtTimestamp(blockTimestamp, startPrice, duration, startTime),
      );
      const expectedRoyalty = (expectedPrice * royaltyBasisPoints) / this.denominator;
      // expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      expect(await this.Erc20.balanceOf(this.signers.royaltyRecipient.address)).to.equal(expectedRoyalty);
    });
    it("transfers the correct amount to the seller", async function () {
      const previousBalance: bigint = await this.Erc20.balanceOf(this.signers.admin.address);
      const [, , , , startPrice, , feeBasisPoints, , royaltyBasisPoints, duration, startTime] =
        await this.bulbafloor.getAuction(0);
      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      const blockTimestamp: bigint = await getBlockTimestamp();
      const expectedPrice: bigint = await calculatePriceAtTimestamp(blockTimestamp, startPrice, duration, startTime);
      const fee = (expectedPrice * feeBasisPoints) / this.denominator;
      const royalty = (expectedPrice * royaltyBasisPoints) / this.denominator;
      const proceeds = expectedPrice - fee - royalty;

      expect(await this.Erc20.balanceOf(this.signers.admin.address)).to.equal(previousBalance + proceeds);
      expect(await this.Erc20.balanceOf(this.signers.feeRecipient.address)).to.equal(fee);
      expect(await this.Erc20.balanceOf(this.signers.royaltyRecipient.address)).to.equal(royalty);
    });
    it("transfers the NFT to the buyer", async function () {
      await this.bulbafloor.connect(this.signers.buyer).buy(0);
      expect(await this.Erc721.ownerOf(0)).to.equal(this.signers.buyer.address);

      await this.bulbafloor.connect(this.signers.buyer).buy(1);
      expect(await this.Erc1155.balanceOf(this.signers.buyer.address, 0)).to.equal(1);
    });
    it("does not charge fee or royalty if feeBasisPoints or royaltyBasisPoints is equal to 0", async function () {
      const previousBalance: bigint = await this.Erc20.balanceOf(this.signers.admin.address);
      await this.Erc721.approve(this.bulbafloor.target, 1);
      await this.bulbafloor.setFeeBasisPoints(0);
      const auctionId = await this.bulbafloor.nextAuctionId();
      await this.bulbafloor.createAuction(
        this.Erc721.target,
        1,
        0,
        0,
        this.Erc20.target,
        10000,
        250,
        ethers.ZeroAddress,
        0,
        10000,
      );
      const [, , , , startPrice, , , , , duration, startTime] = await this.bulbafloor.getAuction(2);

      expect(await this.bulbafloor.connect(this.signers.buyer).buy(auctionId));

      const blockTimestamp: bigint = BigInt(await getBlockTimestamp());
      const expectedPrice: bigint = BigInt(
        await calculatePriceAtTimestamp(blockTimestamp, startPrice, duration, startTime),
      );

      expect(await this.Erc20.balanceOf(this.signers.admin.address)).to.equal(previousBalance + expectedPrice);
      expect(await this.Erc20.balanceOf(this.signers.feeRecipient.address)).to.equal(0);
      expect(await this.Erc20.balanceOf(this.signers.royaltyRecipient.address)).to.equal(0);
    });
    it("emits AuctionSuccessful() with correct parameters", async function () {
      let [, , , , startPrice, , feeBasisPoints, , royaltyBasisPoints, duration, startTime] =
        await this.bulbafloor.getAuction(0);
      let tx = await this.bulbafloor.connect(this.signers.buyer).buy(0);
      let blockTimestamp: bigint = await getBlockTimestamp();
      let expectedPrice: bigint = await calculatePriceAtTimestamp(blockTimestamp, startPrice, duration, startTime);
      let fee = (expectedPrice * feeBasisPoints) / this.denominator;
      let royalty = (expectedPrice * royaltyBasisPoints) / this.denominator;
      await expect(tx)
        .to.emit(this.bulbafloor, "AuctionSuccessful")
        .withArgs(0n, this.signers.admin.address, this.signers.buyer.address, expectedPrice, fee, royalty);

      [, , , , startPrice, , feeBasisPoints, , royaltyBasisPoints, duration, startTime] =
        await this.bulbafloor.getAuction(1);
      tx = await this.bulbafloor.connect(this.signers.buyer).buy(1);
      blockTimestamp = await getBlockTimestamp();
      expectedPrice = await calculatePriceAtTimestamp(blockTimestamp, startPrice, duration, startTime);
      fee = (expectedPrice * feeBasisPoints) / this.denominator;
      royalty = (expectedPrice * royaltyBasisPoints) / this.denominator;
      await expect(tx)
        .to.emit(this.bulbafloor, "AuctionSuccessful")
        .withArgs(1n, this.signers.admin.address, this.signers.buyer.address, expectedPrice, fee, royalty);
    });
  });

  describe("cancelAuction()", function () {
    it("reverts if item has already sold", async function () {
      expect(await this.bulbafloor.connect(this.signers.buyer).buy(0));
      await expect(this.bulbafloor.connect(this.signers.admin).cancelAuction(0))
        .to.be.revertedWithCustomError(this.bulbafloor, "AuctionDoesNotExist")
        .withArgs(0);
    });
    it("reverts if called by account other than seller", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).cancelAuction(0)).to.be.reverted;
    });
    it("deletes auction from storage", async function () {
      await this.bulbafloor.connect(this.signers.admin).cancelAuction(0);
      await expect(this.bulbafloor.checkAuction(0))
        .to.be.revertedWithCustomError(this.bulbafloor, "AuctionDoesNotExist")
        .withArgs(0);
    });
    it("transfers NFT to seller", async function () {
      await this.bulbafloor.connect(this.signers.admin).cancelAuction(0);
      expect(await this.Erc721.ownerOf(0)).to.equal(this.signers.admin.address);
      await this.bulbafloor.connect(this.signers.admin).cancelAuction(1);
      expect(await this.Erc1155.balanceOf(this.signers.admin.address, 0)).to.equal(1);
    });
    it("emits AuctionCancelled() with correct parameters", async function () {
      await expect(this.bulbafloor.connect(this.signers.admin).cancelAuction(0))
        .to.emit(this.bulbafloor, "AuctionCancelled")
        .withArgs(0, this.signers.admin.address, this.Erc721.target, 0);
    });
  });

  describe("recoverNativeTokens()", function () {
    it("transfers full native token balance to feeRecipient", async function () {
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
    it("transfers full balance of given ERC20 tokens to feeRecipient", async function () {
      const previousBalance: bigint = await this.Erc20.balanceOf(this.signers.feeRecipient.address);
      const amount = 1000000n;
      await this.Erc20.transfer(this.bulbafloor.target, amount);
      await this.bulbafloor.recoverERC20tokens([this.Erc20.target]);
      expect(await this.Erc20.balanceOf(this.signers.feeRecipient.address)).to.equal(previousBalance + amount);
    });
  });

  describe("recoverERC721tokens()", function () {
    it("reverts if called by account other than owner", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).recoverERC721tokens([this.Erc721.target], [0])).to.be
        .reverted;
    });
    it("reverts if arrays are unequal length", async function () {
      await expect(this.bulbafloor.recoverERC721tokens([this.Erc721.target], [0, 1])).to.be.reverted;
    });
    it("transfers given ERC721 tokens to feeRecipient", async function () {
      const previousBalance: bigint = await this.Erc721.balanceOf(this.signers.feeRecipient.address);
      await this.Erc721.safeMint(this.signers.admin.address, 2);
      await this.Erc721.safeTransferFrom(this.signers.admin.address, this.bulbafloor.target, 2);
      await this.bulbafloor.recoverERC721tokens([this.Erc721.target], [2]);
      expect(await this.Erc721.balanceOf(this.signers.feeRecipient.address)).to.equal(previousBalance + 1n);
    });
  });

  describe("recoverERC1155tokens()", function () {
    it("reverts if called by account other than owner", async function () {
      await expect(this.bulbafloor.connect(this.signers.buyer).recoverERC1155tokens([this.Erc1155.target], [0], [1])).to
        .be.reverted;
    });
    it("reverts if arrays are unequal length", async function () {
      await expect(this.bulbafloor.recoverERC1155tokens([this.Erc1155.target], [0], [1, 2])).to.be.reverted;
      await expect(this.bulbafloor.recoverERC1155tokens([this.Erc1155.target], [0, 1], [1])).to.be.reverted;
    });
    it("transfers given ERC1155 tokens to feeRecipient", async function () {
      const previousBalance: bigint = await this.Erc1155.balanceOf(this.signers.feeRecipient.address, 0);
      await this.Erc1155.mintBatch(this.bulbafloor.target, [0], [1], "0x");
      await this.bulbafloor.recoverERC1155tokens([this.Erc1155.target], [0], [1]);
      expect(await this.Erc1155.balanceOf(this.signers.feeRecipient.address, 0)).to.equal(previousBalance + 1n);
    });
  });
}
