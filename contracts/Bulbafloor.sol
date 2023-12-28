// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Bulbafloor is Initializable, OwnableUpgradeable, ERC1155Holder, ERC721Holder {
    using SafeMathUpgradeable for uint256;
    using SafeERC20 for IERC20;

    struct Auction {
        uint256 tokenId;
        address tokenContract;
        TokenType tokenType;
        uint256 amount;
        address saleToken;
        address seller;
        uint256 startPrice;
        uint256 reservePrice;
        uint256 feePercentage;
        address royaltyRecipient;
        uint256 royaltyPercentage;
        uint256 duration;
        uint256 startTime;
        bool sold;
    }

    enum TokenType {
        erc721,
        erc1155
    }

    mapping(uint256 auctionId => Auction) public auctions;
    uint256 private nextAuctionId;

    uint256 public feePercentage;
    address public feeCollector;

    error InvalidPercentage();
    error InvalidFeeCollector();
    error durationCannotBeZero();
    error royaltyTooHigh();
    error AuctionDoesNotExist();
    error TooLate();
    error OnlySellerCanCancel();

    event AuctionCreated(
        uint256 auctionId,
        uint256 tokenId,
        address indexed tokenContract,
        TokenType tokenType,
        address indexed saleToken,
        address indexed seller,
        uint256 startPrice,
        uint256 duration
    );
    event AuctionSuccessful(uint256 auctionId, uint256 totalPrice, address winner);
    event AuctionCancelled(uint256 auctionId);
    event FeePercentageSet(uint256 feePercentage);
    event FeeCollectorSet(address feeCollector);

    constructor(address initialOwner) {
        initialize(initialOwner);
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
    }

    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        if (_feePercentage > 100) revert InvalidPercentage();

        feePercentage = _feePercentage;

        emit FeePercentageSet(_feePercentage);
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        if (_feeCollector == feeCollector) revert InvalidFeeCollector();

        feeCollector = _feeCollector;

        emit FeeCollectorSet(_feeCollector);
    }

    function createAuction(
        uint256 tokenId,
        address tokenContract,
        TokenType tokenType,
        uint256 amount,
        address saleToken,
        uint256 startPrice,
        uint256 reservePrice,
        address royaltyRecipient,
        uint256 royaltyPercentage,
        uint256 duration
    ) external {
        if (duration == 0) revert durationCannotBeZero();
        if (royaltyPercentage + feePercentage > 100) revert royaltyTooHigh();

        uint256 auctionId = nextAuctionId;

        auctions[auctionId] = Auction({
            tokenId: tokenId,
            tokenContract: tokenContract,
            tokenType: tokenType,
            amount: amount,
            saleToken: saleToken,
            seller: msg.sender,
            startPrice: startPrice,
            reservePrice: reservePrice,
            feePercentage: feePercentage,
            royaltyRecipient: royaltyRecipient,
            royaltyPercentage: royaltyPercentage,
            duration: duration,
            startTime: block.timestamp,
            sold: false
        });

        nextAuctionId++;

        if (tokenType == TokenType.erc721) {
            IERC721(tokenContract).safeTransferFrom(msg.sender, address(this), tokenId);
        } else {
            IERC1155(tokenContract).safeTransferFrom(msg.sender, address(this), tokenId, 1, "");
        }

        emit AuctionCreated(auctionId, tokenId, tokenContract, tokenType, saleToken, msg.sender, startPrice, duration);
    }

    function buy(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        uint256 tokenId = auction.tokenId;
        if (tokenId == 0) revert AuctionDoesNotExist();

        if (auction.sold) revert TooLate();
        auction.sold = true;

        address saleToken = auction.saleToken;

        (address tokenContract, uint256 currentPrice) = getCurrentPrice(auctionId);
        uint256 feeAmount = 0;
        uint256 _feePercentage = auction.feePercentage;
        if (_feePercentage != 0) {
            feeAmount = currentPrice.mul(_feePercentage).div(100);
            IERC20(saleToken).safeTransferFrom(msg.sender, feeCollector, feeAmount);
        }
        IERC20(saleToken).safeTransferFrom(msg.sender, auction.seller, currentPrice - feeAmount);

        if (auction.tokenType == TokenType.erc721) {
            IERC721(tokenContract).safeTransferFrom(address(this), msg.sender, tokenId);
        } else {
            IERC1155(tokenContract).safeTransferFrom(address(this), msg.sender, tokenId, auction.amount, "");
        }

        emit AuctionSuccessful(auctionId, currentPrice, msg.sender);
    }

    function getCurrentPrice(uint256 auctionId) public view returns (address, uint256) {
        Auction storage auction = auctions[auctionId];

        uint256 elapsedTime = block.timestamp.sub(auction.startTime);
        uint256 duration = auction.duration;
        if (elapsedTime >= duration) {
            return (auction.tokenContract, auction.reservePrice);
        }

        uint256 startPrice = auction.startPrice;
        uint256 priceDrop = startPrice.mul(elapsedTime).div(duration);
        return (auction.tokenContract, startPrice.sub(priceDrop));
    }

    function cancelAuction(uint256 _auctionId) external onlyOwner {
        Auction storage auction = auctions[_auctionId];
        if (auction.startTime.add(auction.duration) <= block.timestamp) {
            revert("Auction has ended");
        }
        if (msg.sender != auction.seller) revert OnlySellerCanCancel();

        address tokenContract = auction.tokenContract;
        TokenType tokenType = auction.tokenType;
        address seller = auction.seller;
        uint256 tokenId = auction.tokenId;
        uint256 amount = auction.amount;

        delete auctions[_auctionId];

        if (tokenType == TokenType.erc721) {
            IERC721(tokenContract).safeTransferFrom(address(this), seller, tokenId);
        } else {
            IERC1155(tokenContract).safeTransferFrom(address(this), seller, tokenId, amount, "");
        }

        emit AuctionCancelled(_auctionId);
    }

    function recoverNativeTokens() external {
        payable(feeCollector).transfer(address(this).balance);
    }

    function recoverERC20(address tokenContract) external {
        uint256 amount = IERC20(tokenContract).balanceOf(address(this));
        IERC20(tokenContract).safeTransferFrom(address(this), feeCollector, amount);
    }

    function recoverERC721(address tokenContract, uint256 tokenId) external onlyOwner {
        IERC721(tokenContract).safeTransferFrom(address(this), feeCollector, tokenId);
    }

    function recoverERC1155(address tokenContract, uint256 tokenId, uint256 amount) external onlyOwner {
        IERC1155(tokenContract).safeTransferFrom(address(this), feeCollector, tokenId, amount, "");
    }
}
