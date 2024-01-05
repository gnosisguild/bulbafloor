import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
} from "matchstick-as/assembly/index";
import { BigInt, Address } from "@graphprotocol/graph-ts";
import { AuctionCancelled } from "../generated/schema";
import { AuctionCancelled as AuctionCancelledEvent } from "../generated/Bulbafloor/Bulbafloor";
import { handleAuctionCancelled } from "../src/bulbafloor";
import { createAuctionCancelledEvent } from "./bulbafloor-utils";

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let auctionId = BigInt.fromI32(234);
    let seller = Address.fromString(
      "0x0000000000000000000000000000000000000001",
    );
    let tokenContract = Address.fromString(
      "0x0000000000000000000000000000000000000001",
    );
    let tokenId = BigInt.fromI32(234);
    let newAuctionCancelledEvent = createAuctionCancelledEvent(
      auctionId,
      seller,
      tokenContract,
      tokenId,
    );
    handleAuctionCancelled(newAuctionCancelledEvent);
  });

  afterAll(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AuctionCancelled created and stored", () => {
    assert.entityCount("AuctionCancelled", 1);

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AuctionCancelled",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "auctionId",
      "234",
    );
    assert.fieldEquals(
      "AuctionCancelled",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "seller",
      "0x0000000000000000000000000000000000000001",
    );
    assert.fieldEquals(
      "AuctionCancelled",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "tokenContract",
      "0x0000000000000000000000000000000000000001",
    );
    assert.fieldEquals(
      "AuctionCancelled",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "tokenId",
      "234",
    );

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  });
});
