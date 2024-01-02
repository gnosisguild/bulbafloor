import {
  AuctionCancelled as AuctionCancelledEvent,
  AuctionCreated as AuctionCreatedEvent,
  AuctionSuccessful as AuctionSuccessfulEvent,
  FeeBasisPointsSet as FeeBasisPointsSetEvent,
  FeeRecipientSet as FeeRecipientSetEvent,
  Initialized as InitializedEvent,
  Initialized1 as Initialized1Event,
  OwnershipTransferred as OwnershipTransferredEvent
} from "../generated/Bulbafloor/Bulbafloor"
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionSuccessful,
  FeeBasisPointsSet,
  FeeRecipientSet,
  Initialized,
  Initialized1,
  OwnershipTransferred
} from "../generated/schema"

export function handleAuctionCancelled(event: AuctionCancelledEvent): void {
  let entity = new AuctionCancelled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.auctionId = event.params.auctionId
  entity.seller = event.params.seller
  entity.tokenContract = event.params.tokenContract
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleAuctionCreated(event: AuctionCreatedEvent): void {
  let entity = new AuctionCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.auctionId = event.params.auctionId
  entity.tokenContract = event.params.tokenContract
  entity.tokenId = event.params.tokenId
  entity.tokenType = event.params.tokenType
  entity.saleToken = event.params.saleToken
  entity.seller = event.params.seller
  entity.startPrice = event.params.startPrice
  entity.reservePrice = event.params.reservePrice
  entity.duration = event.params.duration

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleAuctionSuccessful(event: AuctionSuccessfulEvent): void {
  let entity = new AuctionSuccessful(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.auctionId = event.params.auctionId
  entity.seller = event.params.seller
  entity.buyer = event.params.buyer
  entity.tokenContract = event.params.tokenContract
  entity.tokenId = event.params.tokenId
  entity.amount = event.params.amount
  entity.saleToken = event.params.saleToken
  entity.totalPrice = event.params.totalPrice

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFeeBasisPointsSet(event: FeeBasisPointsSetEvent): void {
  let entity = new FeeBasisPointsSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.feeBasisPoints = event.params.feeBasisPoints

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFeeRecipientSet(event: FeeRecipientSetEvent): void {
  let entity = new FeeRecipientSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.feeRecipient = event.params.feeRecipient

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.version = event.params.version

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleInitialized1(event: Initialized1Event): void {
  let entity = new Initialized1(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.feeBasisPoints = event.params.feeBasisPoints
  entity.feeRecipient = event.params.feeRecipient

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
