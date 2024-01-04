import { dataSource, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  AuctionCancelled as AuctionCancelledEvent,
  AuctionCreated as AuctionCreatedEvent,
  AuctionSuccessful as AuctionSuccessfulEvent,
  FeeBasisPointsSet as FeeBasisPointsSetEvent,
  FeeRecipientSet as FeeRecipientSetEvent,
  Initialized as InitializedEvent,
  Initialized1 as Initialized1Event,
  OwnershipTransferred as OwnershipTransferredEvent,
} from "../generated/Bulbafloor/Bulbafloor";
import {
  Auction,
  Seller,
  Buyer,
  Collection,
  SaleToken,
  RoyaltyRecipient,
  FeeRecipient,
} from "../generated/schema";

function loadOrCreateSeller(address: string): Seller {
  const id = dataSource
    .context()
    .getString("networkId")
    .concat("-")
    .concat(address);
  let seller = Seller.load(id);
  if (seller == null) {
    seller = new Seller(id);
    seller.totalProceeds = BigInt.fromI32(0);
    seller.averageProceeds = BigInt.fromI32(0);
    seller.auctionsSold = BigInt.fromI32(0);
    seller.save();
  }
  return seller as Seller;
}

function loadOrCreateBuyer(address: string): Buyer {
  const id = dataSource
    .context()
    .getString("networkId")
    .concat("-")
    .concat(address);
  let seller = Seller.load(id);
  let buyer = Buyer.load(id);
  if (buyer == null) {
    buyer = new Buyer(id);
    buyer.totalSpent = BigInt.fromI32(0);
    buyer.averageSpent = BigInt.fromI32(0);
    buyer.totalAuctionsBought = BigInt.fromI32(0);
    buyer.save();
  }
  return buyer as Buyer;
}

function loadOrCreateCollection(address: string): Collection {
  const id = dataSource
    .context()
    .getString("networkId")
    .concat("-")
    .concat(address);
  let collection = Collection.load(id);
  if (collection == null) {
    collection = new Collection(id);
    collection.totalProceeds = BigInt.fromI32(0);
    collection.averageProceeds = BigInt.fromI32(0);
    collection.totalSales = BigInt.fromI32(0);
    collection.save();
  }
  return collection as Collection;
}

function loadOrCreateSaleToken(address: string): SaleToken {
  const id = dataSource
    .context()
    .getString("networkId")
    .concat("-")
    .concat(address);
  let saleToken = SaleToken.load(id);
  if (saleToken == null) {
    saleToken = new SaleToken(id);
    saleToken.totalProceeds = BigInt.fromI32(0);
    saleToken.save();
  }
  return saleToken as SaleToken;
}

function loadOrCreateRoyaltyRecipient(address: string): RoyaltyRecipient {
  const id = dataSource
    .context()
    .getString("networkId")
    .concat("-")
    .concat(address);
  let royaltyRecipient = RoyaltyRecipient.load(id);
  if (royaltyRecipient == null) {
    royaltyRecipient = new RoyaltyRecipient(id);
    royaltyRecipient.totalRoyaltiesReceived = BigInt.fromI32(0);
    royaltyRecipient.averageRoyaltiesReceived = BigInt.fromI32(0);
    royaltyRecipient.totalAuctionsSold = BigInt.fromI32(0);
    royaltyRecipient.save();
  }
  return royaltyRecipient as RoyaltyRecipient;
}

function loadOrCreateFeeRecipient(address: string): FeeRecipient {
  const id = dataSource
    .context()
    .getString("networkId")
    .concat("-")
    .concat(address);
  let feeRecipient = FeeRecipient.load(id);
  if (feeRecipient == null) {
    feeRecipient = new FeeRecipient(id);
    feeRecipient.totalFeesReceived = BigInt.fromI32(0);
    feeRecipient.averageFeeReceived = BigInt.fromI32(0);
    feeRecipient.totalAuctionsSold = BigInt.fromI32(0);
    feeRecipient.save();
  }
  return feeRecipient as FeeRecipient;
}

export function handleAuctionCreated(event: AuctionCreatedEvent): void {
  let auction = new Auction(
    dataSource
      .context()
      .getString("networkId")
      .concat("-")
      .concat(event.params.auctionId.toString()),
  );
  auction.auctionId = event.params.auctionId;
  auction.tokenContract = loadOrCreateCollection(
    event.params.token.tokenContract.toHexString(),
  ).id;
  auction.tokenId = event.params.token.tokenId;
  auction.tokenType = event.params.token.tokenType;
  auction.saleToken = loadOrCreateSaleToken(
    event.params.saleToken.toHexString(),
  ).id;
  auction.seller = loadOrCreateSeller(event.params.seller.toHexString()).id;
  auction.startPrice = event.params.startPrice;
  auction.reservePrice = event.params.reservePrice;
  auction.duration = event.params.duration;

  auction.blockNumber = event.block.number;
  auction.blockTimestamp = event.block.timestamp;
  auction.transactionHash = event.transaction.hash;

  // tokenContract: Collection! # address
  // tokenId: BigInt! # uint256
  // tokenType: Int! # uint8
  // saleToken: SaleToken! # address
  // seller: Seller! # address
  // startPrice: BigInt! # uint256
  // reservePrice: BigInt! # uint256
  // duration: BigInt! # uint256
  // buyer: Buyer! # address
  // salePrice: BigInt! # uint256
  // feeRecipient: FeeRecipient! # address
  // feeBasisPoints: BigInt! # uint256
  // fee: BigInt! # uint256
  // royaltyRecipient: RoyaltyRecipient! # address
  // royaltyBasisPoints: BigInt! # uint256
  // royalty: BigInt! # uint256
  // sold: Boolean!
  // cancelled: Boolean!
  // blockNumber: BigInt!
  // blockTimestamp: BigInt!
  // transactionHash: Bytes!

  auction.save();
}

export function handleAuctionSuccessful(event: AuctionSuccessfulEvent): void {
  let entity = new AuctionSuccessful(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.auctionId = event.params.auctionId;
  entity.seller = event.params.seller;
  entity.buyer = event.params.buyer;
  entity.tokenContract = event.params.tokenContract;
  entity.tokenId = event.params.tokenId;
  entity.amount = event.params.amount;
  entity.saleToken = event.params.saleToken;
  entity.totalPrice = event.params.totalPrice;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleAuctionCancelled(event: AuctionCancelledEvent): void {
  let entity = new AuctionCancelled(
    dataSource
      .context()
      .getString("networkId")
      .concat("-")
      .concat(event.params.auctionId.toString()),
  );
  entity.auctionId = event.params.auctionId;
  entity.seller = event.params.seller;
  entity.tokenContract = event.params.tokenContract;
  entity.tokenId = event.params.tokenId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleFeeBasisPointsSet(event: FeeBasisPointsSetEvent): void {
  let entity = new FeeBasisPointsSet(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.feeBasisPoints = event.params.feeBasisPoints;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleFeeRecipientSet(event: FeeRecipientSetEvent): void {
  let entity = new FeeRecipientSet(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.feeRecipient = event.params.feeRecipient;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.version = event.params.version;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleInitialized1(event: Initialized1Event): void {
  let entity = new Initialized1(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.owner = event.params.owner;
  entity.feeBasisPoints = event.params.feeBasisPoints;
  entity.feeRecipient = event.params.feeRecipient;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent,
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.previousOwner = event.params.previousOwner;
  entity.newOwner = event.params.newOwner;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
