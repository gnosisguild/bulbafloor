import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionSuccessful,
  FeeBasisPointsSet,
  FeeRecipientSet,
  Initialized,
  Initialized1,
  OwnershipTransferred
} from "../generated/Bulbafloor/Bulbafloor"

export function createAuctionCancelledEvent(
  auctionId: BigInt,
  seller: Address,
  tokenContract: Address,
  tokenId: BigInt
): AuctionCancelled {
  let auctionCancelledEvent = changetype<AuctionCancelled>(newMockEvent())

  auctionCancelledEvent.parameters = new Array()

  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId)
    )
  )
  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam("seller", ethereum.Value.fromAddress(seller))
  )
  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "tokenContract",
      ethereum.Value.fromAddress(tokenContract)
    )
  )
  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return auctionCancelledEvent
}

export function createAuctionCreatedEvent(
  auctionId: BigInt,
  tokenContract: Address,
  tokenId: BigInt,
  tokenType: i32,
  saleToken: Address,
  seller: Address,
  startPrice: BigInt,
  reservePrice: BigInt,
  duration: BigInt
): AuctionCreated {
  let auctionCreatedEvent = changetype<AuctionCreated>(newMockEvent())

  auctionCreatedEvent.parameters = new Array()

  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId)
    )
  )
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "tokenContract",
      ethereum.Value.fromAddress(tokenContract)
    )
  )
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "tokenType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(tokenType))
    )
  )
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam("saleToken", ethereum.Value.fromAddress(saleToken))
  )
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam("seller", ethereum.Value.fromAddress(seller))
  )
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "startPrice",
      ethereum.Value.fromUnsignedBigInt(startPrice)
    )
  )
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "reservePrice",
      ethereum.Value.fromUnsignedBigInt(reservePrice)
    )
  )
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "duration",
      ethereum.Value.fromUnsignedBigInt(duration)
    )
  )

  return auctionCreatedEvent
}

export function createAuctionSuccessfulEvent(
  auctionId: BigInt,
  seller: Address,
  buyer: Address,
  tokenContract: Address,
  tokenId: BigInt,
  amount: BigInt,
  saleToken: Address,
  totalPrice: BigInt
): AuctionSuccessful {
  let auctionSuccessfulEvent = changetype<AuctionSuccessful>(newMockEvent())

  auctionSuccessfulEvent.parameters = new Array()

  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam(
      "auctionId",
      ethereum.Value.fromUnsignedBigInt(auctionId)
    )
  )
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam("seller", ethereum.Value.fromAddress(seller))
  )
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam("buyer", ethereum.Value.fromAddress(buyer))
  )
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam(
      "tokenContract",
      ethereum.Value.fromAddress(tokenContract)
    )
  )
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam("saleToken", ethereum.Value.fromAddress(saleToken))
  )
  auctionSuccessfulEvent.parameters.push(
    new ethereum.EventParam(
      "totalPrice",
      ethereum.Value.fromUnsignedBigInt(totalPrice)
    )
  )

  return auctionSuccessfulEvent
}

export function createFeeBasisPointsSetEvent(
  feeBasisPoints: BigInt
): FeeBasisPointsSet {
  let feeBasisPointsSetEvent = changetype<FeeBasisPointsSet>(newMockEvent())

  feeBasisPointsSetEvent.parameters = new Array()

  feeBasisPointsSetEvent.parameters.push(
    new ethereum.EventParam(
      "feeBasisPoints",
      ethereum.Value.fromUnsignedBigInt(feeBasisPoints)
    )
  )

  return feeBasisPointsSetEvent
}

export function createFeeRecipientSetEvent(
  feeRecipient: Address
): FeeRecipientSet {
  let feeRecipientSetEvent = changetype<FeeRecipientSet>(newMockEvent())

  feeRecipientSetEvent.parameters = new Array()

  feeRecipientSetEvent.parameters.push(
    new ethereum.EventParam(
      "feeRecipient",
      ethereum.Value.fromAddress(feeRecipient)
    )
  )

  return feeRecipientSetEvent
}

export function createInitializedEvent(version: BigInt): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(version)
    )
  )

  return initializedEvent
}

export function createInitialized1Event(
  owner: Address,
  feeBasisPoints: i32,
  feeRecipient: Address
): Initialized1 {
  let initialized1Event = changetype<Initialized1>(newMockEvent())

  initialized1Event.parameters = new Array()

  initialized1Event.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  initialized1Event.parameters.push(
    new ethereum.EventParam(
      "feeBasisPoints",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(feeBasisPoints))
    )
  )
  initialized1Event.parameters.push(
    new ethereum.EventParam(
      "feeRecipient",
      ethereum.Value.fromAddress(feeRecipient)
    )
  )

  return initialized1Event
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}
