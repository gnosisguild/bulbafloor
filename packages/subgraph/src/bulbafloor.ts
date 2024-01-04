import { dataSource, BigInt, log } from "@graphprotocol/graph-ts";
import {
  AuctionCancelled as AuctionCancelledEvent,
  AuctionCreated as AuctionCreatedEvent,
  AuctionSuccessful as AuctionSuccessfulEvent,
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

const ONE: BigInt = BigInt.fromI32(1);

function loadOrCreateSeller(address: string): Seller {
  const id = dataSource
    .context()
    .getString("networkId")
    .concat("-")
    .concat(address);
  let seller = Seller.load(id);
  if (seller == null) {
    seller = new Seller(id);
    seller.totalAuctionsSold = BigInt.fromI32(0);
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
  let buyer = Buyer.load(id);
  if (buyer == null) {
    buyer = new Buyer(id);
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
    collection.totalAuctionsSold = BigInt.fromI32(0);
    collection.totalAuctionsCreated = BigInt.fromI32(0);
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
    feeRecipient.totalAuctionsSold = BigInt.fromI32(0);
    feeRecipient.save();
  }
  return feeRecipient as FeeRecipient;
}

export function handleAuctionCreated(event: AuctionCreatedEvent): void {
  const collection = loadOrCreateCollection(
    event.params.auction.token.tokenContract.toHexString(),
  );
  collection.totalAuctionsCreated = collection.totalAuctionsCreated.plus(ONE);
  collection.save();
  const auction = new Auction(
    dataSource
      .context()
      .getString("networkId")
      .concat("-")
      .concat(event.params.auctionId.toString()),
  );
  auction.auctionId = event.params.auctionId;
  auction.collection = collection.id;
  auction.tokenId = event.params.auction.token.tokenId;
  auction.tokenType = event.params.auction.token.tokenType;
  auction.saleToken = loadOrCreateSaleToken(
    event.params.auction.saleToken.toHexString(),
  ).id;
  auction.seller = loadOrCreateSeller(event.params.seller.toHexString()).id;
  auction.startPrice = event.params.auction.startPrice;
  auction.reservePrice = event.params.auction.reservePrice;
  auction.duration = event.params.auction.duration;
  auction.feeRecipient = loadOrCreateFeeRecipient(
    event.params.auction.feeRecipient.toString(),
  ).id;
  auction.feeBasisPoints = BigInt.fromI32(event.params.auction.feeBasisPoints);
  auction.royaltyRecipient = loadOrCreateRoyaltyRecipient(
    event.params.auction.royaltyRecipient.toString(),
  ).id;
  auction.royaltyBasisPoints = BigInt.fromI32(
    event.params.auction.royaltyBasisPoints,
  );
  auction.sold = false;
  auction.cancelled = false;
  // the following properties are not set on creation:
  // auction.buyer
  // auction.salePrice
  // auction.fee
  // auction.royalty
  // auction.soldTimestamp
  auction.save();
}

export function handleAuctionSuccessful(event: AuctionSuccessfulEvent): void {
  const seller = loadOrCreateSeller(event.params.seller.toString());
  seller.totalAuctionsSold = seller.totalAuctionsSold.plus(ONE);
  seller.save();

  const buyer = loadOrCreateBuyer(event.params.buyer.toString());
  buyer.totalAuctionsBought = buyer.totalAuctionsBought.plus(ONE);
  buyer.save();

  const auction = Auction.load(
    dataSource
      .context()
      .getString("networkId")
      .concat("-")
      .concat(event.params.auctionId.toString()),
  );
  if (!auction) {
    log.error("auction does not exist", [event.params.auctionId.toString()]);
    return;
  }
  auction.buyer = buyer.id;
  auction.salePrice = event.params.price;
  auction.fee = event.params.fee;
  auction.royalty = event.params.royalty;
  auction.soldTimestamp = event.block.timestamp;
  auction.sold = true;
  auction.save();

  const collection = loadOrCreateCollection(auction.collection);
  collection.totalAuctionsSold = collection.totalAuctionsSold.plus(ONE);
  collection.save();

  const saleToken = loadOrCreateSaleToken(auction.saleToken);
  saleToken.totalProceeds = saleToken.totalProceeds.plus(event.params.price);
  saleToken.totalAuctionsSold = saleToken.totalAuctionsSold.plus(ONE);
  saleToken.save();

  const royaltyRecipient = loadOrCreateRoyaltyRecipient(
    auction.royaltyRecipient,
  );
  royaltyRecipient.totalAuctionsSold =
    royaltyRecipient.totalAuctionsSold.plus(ONE);
  royaltyRecipient.save();

  const feeRecipient = loadOrCreateFeeRecipient(auction.feeRecipient);
  feeRecipient.totalAuctionsSold = feeRecipient.totalAuctionsSold.plus(ONE);
  feeRecipient.save();
}

export function handleAuctionCancelled(event: AuctionCancelledEvent): void {
  const auction = Auction.load(
    dataSource
      .context()
      .getString("networkId")
      .concat("-")
      .concat(event.params.auctionId.toString()),
  );
  if (!auction) {
    log.error("auction does not exist", [event.params.auctionId.toString()]);
    return;
  }
  auction.cancelled = false;
  auction.cancelledTimestamp = event.block.timestamp;
  auction.save();
}
