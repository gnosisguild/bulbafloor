import { newMockEvent } from "matchstick-as";
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts";
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionSuccessful,
} from "../generated/Bulbafloor/Bulbafloor";

export function createAuctionCancelledEvent(
  auctionId: BigInt,
  seller: Address,
  tokenContract: Address,
  tokenId: BigInt,
): AuctionCancelled {
  const auctionCancelledEvent = changetype<AuctionCancelled>(newMockEvent());

  auctionCancelledEvent.parameters = [];

  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId),
    ),
  );
  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam("seller", ethereum.Value.fromAddress(seller)),
  );
  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "tokenContract",
      ethereum.Value.fromAddress(tokenContract),
    ),
  );
  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId),
    ),
  );

  return auctionCancelledEvent;
}

export function createAuctionCreatedEvent(
  auctionId: BigInt,
  tokenContract: Address,
  tokenId: BigInt,
  tokenType: BigInt,
  amount: BigInt,
  saleToken: Address,
  seller: Address,
  startPrice: BigInt,
  reservePrice: BigInt,
  feeRecipient: Address,
  feeBasisPoints: BigInt,
  royaltyRecipient: Address,
  royalyBasisPoints: BigInt,
  duration: BigInt,
  startTime: BigInt,
): AuctionCreated {
  const auctionCreatedEvent = changetype<AuctionCreated>(newMockEvent());
  auctionCreatedEvent.parameters = [
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId),
    ),
    new ethereum.EventParam(
      "auction",
      ethereum.Value.fromTuple([
        ethereum.Value.fromTuple([
          ethereum.Value.fromAddress(tokenContract),
          ethereum.Value.fromUnsignedBigInt(tokenId),
          ethereum.Value.fromUnsignedBigInt(tokenType),
        ]),
        ethereum.Value.fromUnsignedBigInt(amount),
        ethereum.Value.fromAddress(saleToken),
        ethereum.Value.fromAddress(seller),
        ethereum.Value.fromUnsignedBigInt(startPrice),
        ethereum.Value.fromUnsignedBigInt(reservePrice),
        ethereum.Value.fromAddress(feeRecipient),
        ethereum.Value.fromUnsignedBigInt(feeBasisPoints),
        ethereum.Value.fromAddress(royaltyRecipient),
        ethereum.Value.fromUnsignedBigInt(royalyBasisPoints),
        ethereum.Value.fromUnsignedBigInt(duration),
        ethereum.Value.fromUnsignedBigInt(startTime),
      ]),
    ),
    new ethereum.EventParam("seller", ethereum.Value.fromAddress(seller)),
    new ethereum.EventParam(
      "tokenContract",
      ethereum.Value.fromAddress(tokenContract),
    ),
  ];

  // log each of the paramerts
  auctionCreatedEvent.parameters.forEach((x) =>
    console.log(x.name.concat(": ").concat(x.value.toString())),
  );

  return auctionCreatedEvent;
}

export function createAuctionSuccessfulEvent(
  auctionId: BigInt,
  seller: Address,
  buyer: Address,
  price: BigInt,
  fee: BigInt,
  royalty: BigInt,
): AuctionSuccessful {
  const auctionSuccessfulEvent = changetype<AuctionSuccessful>(newMockEvent());

  auctionSuccessfulEvent.parameters = [];

  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId),
    ),
  );
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam("seller", ethereum.Value.fromAddress(seller)),
  );
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam("buyer", ethereum.Value.fromAddress(buyer)),
  );
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price)),
  );
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam("fee", ethereum.Value.fromUnsignedBigInt(fee)),
  );
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam(
      "royalty",
      ethereum.Value.fromUnsignedBigInt(royalty),
    ),
  );

  return auctionSuccessfulEvent;
}
