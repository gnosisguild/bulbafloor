// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.20;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { ERC1155Holder } from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Bulbafloor is Initializable, OwnableUpgradeable, ERC1155Holder, ERC721Holder {
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
        uint16 feeBasisPoints;
        address royaltyRecipient;
        uint16 royaltyBasisPoints;
        uint256 duration;
        uint256 startTime;
        bool sold;
    }

    enum TokenType {
        erc721,
        erc1155
    }

    uint16 public constant DENOMINATOR = 10000;

    uint256 public nextAuctionId;
    mapping(uint256 auctionId => Auction auction) public auctions;
    address public feeCollector;
    uint16 public feeBasisPoints;

    error FeeBasisPointsGreaterThanDenominator(uint16 denominator, uint16 feeBasisPoints);
    error FeeCollectorAlreadySetToThisAddress(address feeCollector);
    error DurationCannotBeZero();
    error RoyaltyBasisPointsPlusFeeBasisPointsGreaterThanDenominator(
        uint16 denominator,
        uint16 feeBasisPoints,
        uint16 royalteeBasisPoints
    ); // 😅
    error AuctionDoesNotExist(uint256 auctionId);
    error OnlySellerCanCancel(address seller);
    error InvalidLengths();

    event Initialized(address indexed owner, uint16 feeBasisPoints, address indexed feeCollector);
    event AuctionCreated(
        uint256 auctionId,
        address indexed tokenContract,
        uint256 tokenId,
        TokenType tokenType,
        address indexed saleToken,
        address indexed seller,
        uint256 startPrice,
        uint256 reservePrice,
        uint256 duration
    );
    event AuctionSuccessful(
        uint256 auctionId,
        address indexed seller,
        address indexed buyer,
        address indexed tokenContract,
        uint256 tokenId,
        uint256 amount,
        address saleToken,
        uint256 totalPrice
    );
    event AuctionCancelled(uint256 auctionId, address indexed seller, address indexed tokenContract, uint256 tokenId);
    event FeeBasisPointsSet(uint256 feeBasisPoints);
    event FeeCollectorSet(address feeCollector);

    constructor(address initialOwner, uint16 _feeBasisPoints, address _feeCollector) {
        initialize(initialOwner, _feeBasisPoints, _feeCollector);
    }

    function initialize(address initialOwner, uint16 _feeBasisPoints, address _feeCollector) public initializer {
        __Ownable_init(initialOwner);
        feeBasisPoints = _feeBasisPoints;
        feeCollector = _feeCollector;

        emit Initialized(initialOwner, _feeBasisPoints, feeCollector);
    }

    function setFeeBasisPoints(uint16 _feeBasisPoints) external onlyOwner {
        if (_feeBasisPoints > DENOMINATOR) revert FeeBasisPointsGreaterThanDenominator(DENOMINATOR, _feeBasisPoints);

        feeBasisPoints = _feeBasisPoints;

        emit FeeBasisPointsSet(_feeBasisPoints);
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        if (_feeCollector == feeCollector) revert FeeCollectorAlreadySetToThisAddress(_feeCollector);

        feeCollector = _feeCollector;

        emit FeeCollectorSet(_feeCollector);
    }

    function checkAuction(uint256 auctionId) public view returns (uint256) {
        if (auctions[auctionId].tokenContract == address(0)) revert AuctionDoesNotExist(auctionId);
        return auctionId;
    }

    function getCurrentPrice(uint256 auctionId) public view returns (address, uint256) {
        Auction storage auction = auctions[checkAuction(auctionId)];

        uint256 elapsedTime = block.timestamp - auction.startTime;
        uint256 duration = auction.duration;
        if (elapsedTime >= duration) return (auction.tokenContract, auction.reservePrice);

        uint256 startPrice = auction.startPrice;
        uint256 priceDrop = (startPrice * elapsedTime) / duration;
        uint256 currentPrice = startPrice - priceDrop;
        if (currentPrice < auction.reservePrice) currentPrice = auction.reservePrice;
        return (auction.tokenContract, currentPrice);
    }

    function getAuction(
        uint256 auctionId
    )
        external
        view
        returns (
            address tokenContract,
            uint256 tokenId,
            TokenType tokenType,
            uint256 amount,
            address saleToken,
            address seller,
            uint256 startPrice,
            uint256 reservePrice,
            uint16 _feeBasisPoints,
            address royaltyRecipient,
            uint16 royaltyBasisPoints,
            uint256 duration,
            uint256 startTime,
            bool sold
        )
    {
        Auction storage auction = auctions[checkAuction(auctionId)];
        return (
            auction.tokenContract,
            auction.tokenId,
            auction.tokenType,
            auction.amount,
            auction.saleToken,
            auction.seller,
            auction.startPrice,
            auction.reservePrice,
            auction.feeBasisPoints,
            auction.royaltyRecipient,
            auction.royaltyBasisPoints,
            auction.duration,
            auction.startTime,
            auction.sold
        );
    }

    function deleteAuction(uint256 auctionId) internal {
        delete auctions[auctionId];
    }

    function createAuction(
        address tokenContract,
        uint256 tokenId,
        TokenType tokenType,
        uint256 amount,
        address saleToken,
        uint256 startPrice,
        uint256 reservePrice,
        address royaltyRecipient,
        uint16 royaltyBasisPoints,
        uint256 duration
    ) external {
        if (duration == 0) revert DurationCannotBeZero();
        if (royaltyBasisPoints + feeBasisPoints > DENOMINATOR)
            revert RoyaltyBasisPointsPlusFeeBasisPointsGreaterThanDenominator(
                DENOMINATOR,
                feeBasisPoints,
                royaltyBasisPoints
            );

        uint256 auctionId = nextAuctionId;
        nextAuctionId++;

        auctions[auctionId] = Auction({
            tokenId: tokenId,
            tokenContract: tokenContract,
            tokenType: tokenType,
            amount: amount,
            saleToken: saleToken,
            seller: msg.sender,
            startPrice: startPrice,
            reservePrice: reservePrice,
            feeBasisPoints: feeBasisPoints,
            royaltyRecipient: royaltyRecipient,
            royaltyBasisPoints: royaltyBasisPoints,
            duration: duration,
            startTime: block.timestamp,
            sold: false
        });

        if (tokenType == TokenType.erc721) {
            IERC721(tokenContract).safeTransferFrom(msg.sender, address(this), tokenId);
        } else {
            IERC1155(tokenContract).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        }

        emit AuctionCreated(
            auctionId,
            tokenContract,
            tokenId,
            tokenType,
            saleToken,
            msg.sender,
            startPrice,
            reservePrice,
            duration
        );
    }

    function buy(uint256 auctionId) external {
        Auction storage auction = auctions[checkAuction(auctionId)];

        address seller = auction.seller;
        address saleToken = auction.saleToken;
        uint256 tokenId = auction.tokenId;
        TokenType tokenType = auction.tokenType;
        (address tokenContract, uint256 currentPrice) = getCurrentPrice(auctionId);
        uint256 fee = 0;
        uint16 _feeBasisPoints = auction.feeBasisPoints;
        uint256 royalty = 0;
        uint16 royaltyBasisPoints = auction.royaltyBasisPoints;
        address royaltyRecipient = auction.royaltyRecipient;
        uint256 amount = auction.amount;

        deleteAuction(auctionId);

        if (_feeBasisPoints != 0) {
            fee = (currentPrice * _feeBasisPoints) / DENOMINATOR;
            IERC20(saleToken).safeTransferFrom(msg.sender, feeCollector, fee);
        }

        if (royaltyBasisPoints != 0) {
            royalty = (currentPrice * royaltyBasisPoints) / DENOMINATOR;
            IERC20(saleToken).safeTransferFrom(msg.sender, royaltyRecipient, royalty);
        }

        IERC20(saleToken).safeTransferFrom(msg.sender, seller, currentPrice - fee);

        if (tokenType == TokenType.erc721) {
            IERC721(tokenContract).safeTransferFrom(address(this), msg.sender, tokenId);
            amount = 1;
        } else IERC1155(tokenContract).safeTransferFrom(address(this), msg.sender, tokenId, amount, "");

        emit AuctionSuccessful(auctionId, seller, msg.sender, tokenContract, tokenId, amount, saleToken, currentPrice);
    }

    function cancelAuction(uint256 auctionId) external {
        Auction storage auction = auctions[checkAuction(auctionId)];
        address seller = auction.seller;
        if (msg.sender != seller) revert OnlySellerCanCancel(seller);

        address tokenContract = auction.tokenContract;
        TokenType tokenType = auction.tokenType;
        uint256 tokenId = auction.tokenId;
        uint256 amount = auction.amount;

        deleteAuction(auctionId);

        if (tokenType == TokenType.erc721) IERC721(tokenContract).safeTransferFrom(address(this), seller, tokenId);
        else IERC1155(tokenContract).safeTransferFrom(address(this), seller, tokenId, amount, "");

        emit AuctionCancelled(auctionId, seller, tokenContract, tokenId);
    }

    function recoverNativeTokens() external {
        payable(feeCollector).transfer(address(this).balance);
    }

    function recoverERC20tokens(address[] memory tokenContracts) external {
        for (uint256 i = 0; i < tokenContracts.length; i++) {
            uint256 amount = IERC20(tokenContracts[i]).balanceOf(address(this));
            IERC20(tokenContracts[i]).safeTransfer(feeCollector, amount);
        }
    }

    function recoverERC721tokens(address[] calldata tokenContracts, uint256[] calldata tokenIds) external onlyOwner {
        if (tokenContracts.length != tokenIds.length) revert InvalidLengths();
        for (uint256 i = 0; i < tokenContracts.length; i++) {
            IERC721(tokenContracts[i]).safeTransferFrom(address(this), feeCollector, tokenIds[i]);
        }
    }

    function recoverERC1155tokens(
        address[] calldata tokenContracts,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external onlyOwner {
        if (tokenContracts.length != tokenIds.length || tokenContracts.length != amounts.length)
            revert InvalidLengths();
        for (uint256 i = 0; i < tokenContracts.length; i++) {
            IERC1155(tokenContracts[i]).safeTransferFrom(address(this), feeCollector, tokenIds[i], amounts[i], "");
        }
    }
}
