/* Bulbafloor 🌷
                                           /
                        _,.------....___,.' ',.-.
                     ,-'          _,.--"        |
                   ,'         _.-'              .
                  /   ,     ,'                   `
                 .   /     /                     ``.
                 |  |     .                       \.\
       ____      |___._.  |       __               \ `.
     .'    `---""       ``"-.--"'`  \               .  \
    .  ,            __               `              |   .
    `,'         ,-"'  .               \             |    L
   ,'          '    _.'                -._          /    |
  ,`-.    ,".   `--'                      >.      ,'     |
 . .'\'   `-'       __    ,  ,-.         /  `.__.-      ,'
 ||:, .           ,'  ;  /  / \ `        `.    .      .'/
 j|:D  \          `--'  ' ,'_  . .         `.__, \   , /
/ L:_  |                 .  "' :_;                `.'.'
.    ""'                  """""'                    V
 `.                                 .    `.   _,..  `
   `,_   .    .                _,-'/    .. `,'   __  `
    ) \`._        ___....----"'  ,'   .'  \ |   '  \  .
   /   `. "`-.--"'         _,' ,'     `---' |    `./  |
  .   _  `""'--.._____..--"   ,             '         |
  | ." `. `-.                /-.           /          ,
  | `._.'    `,_            ;  /         ,'          .
 .'          /| `-.        . ,'         ,           ,
 '-.__ __ _,','    '`-..___;-...__   ,.'\ ____.___.'
 `"^--'..'   '-`-^-'"--    `-^-'`.''"""""`.,^.`.--'
 Made with ❤️ by Gnosis Guild
 */

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

/// @title Bulbafloor 🌷
/// @notice A contract for selling ERC721 and ERC1155 tokens for ERC20 tokens via dutch auction
/// @author Auryn Macmillan (email: auryn@gnosisguild.org) (twitter: @auryn_macmillan) (github: auryn-macmillan)
contract Bulbafloor is Initializable, OwnableUpgradeable, ERC1155Holder, ERC721Holder {
    using SafeERC20 for IERC20;

    struct Auction {
        Token token;
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
    }

    struct Token {
        address tokenContract;
        uint256 tokenId;
        TokenType tokenType;
    }

    enum TokenType {
        erc721,
        erc1155
    }

    uint16 public constant DENOMINATOR = 10000;

    uint256 public nextAuctionId;
    mapping(uint256 auctionId => Auction auction) public auctions;
    address public feeRecipient;
    uint16 public feeBasisPoints;

    error FeeBasisPointsGreaterThanDenominator(uint16 denominator, uint16 feeBasisPoints);
    error FeeRecipientAlreadySetToThisAddress(address feeRecipient);
    error DurationCannotBeZero();
    error RoyaltyBasisPointsPlusFeeBasisPointsGreaterThanDenominator(
        uint16 denominator,
        uint16 feeBasisPoints,
        uint16 royalteeBasisPoints
    ); // 😅
    error AuctionDoesNotExist(uint256 auctionId);
    error OnlySellerCanCancel(address seller);
    error InvalidLengths();

    event Initialized(address indexed owner, uint16 feeBasisPoints, address indexed feeRecipient);
    event AuctionCreated(
        uint256 auctionId,
        Token token,
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
        Token token,
        uint256 amount,
        address saleToken,
        uint256 totalPrice
    );
    event AuctionCancelled(uint256 auctionId, address indexed seller, address indexed tokenContract, uint256 tokenId);
    event FeeBasisPointsSet(uint256 feeBasisPoints);
    event FeeRecipientSet(address feeRecipient);

    /// @notice Initializes the contract
    /// @param initialOwner Address to be set as owner of the contract
    /// @param _feeBasisPoints Fee basis points to be set
    /// @param _feeRecipient Address to be set as fee recipient
    constructor(address initialOwner, uint16 _feeBasisPoints, address _feeRecipient) {
        initialize(initialOwner, _feeBasisPoints, _feeRecipient);
    }

    /// @notice Initializes the contract
    /// @param initialOwner Address to be set as owner of the contract
    /// @param _feeBasisPoints Fee basis points to be set
    /// @param _feeRecipient Address to be set as fee collector
    function initialize(address initialOwner, uint16 _feeBasisPoints, address _feeRecipient) public initializer {
        __Ownable_init(initialOwner);
        feeBasisPoints = _feeBasisPoints;
        feeRecipient = _feeRecipient;

        emit Initialized(initialOwner, _feeBasisPoints, feeRecipient);
    }

    /// @notice Sets the fee basis points
    /// @dev Only owner can call this function
    /// @param _feeBasisPoints Fee basis points to be set
    function setFeeBasisPoints(uint16 _feeBasisPoints) external onlyOwner {
        if (_feeBasisPoints > DENOMINATOR) revert FeeBasisPointsGreaterThanDenominator(DENOMINATOR, _feeBasisPoints);

        feeBasisPoints = _feeBasisPoints;

        emit FeeBasisPointsSet(_feeBasisPoints);
    }

    /// @notice Sets the fee recipient
    /// @dev Only owner can call this function
    /// @param _feeRecipient Address to be set as fee recipient
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == feeRecipient) revert FeeRecipientAlreadySetToThisAddress(_feeRecipient);

        feeRecipient = _feeRecipient;

        emit FeeRecipientSet(_feeRecipient);
    }

    /// @notice Returns the auction id
    /// @dev Throws if auction does not exist
    /// @param auctionId Auction id to be checked
    /// @return uint256 Auction id
    function checkAuction(uint256 auctionId) public view returns (uint256) {
        if (auctions[auctionId].token.tokenContract == address(0)) revert AuctionDoesNotExist(auctionId);
        return auctionId;
    }

    /// @notice Returns the current price of the auction
    /// @dev Throws if auction does not exist
    /// @param auctionId Auction id to be checked
    /// @return address Address of the token contract
    /// @return uint256 Current price of the auction
    function getCurrentPrice(uint256 auctionId) public view returns (address, uint256) {
        Auction storage auction = auctions[checkAuction(auctionId)];

        uint256 elapsedTime = block.timestamp - auction.startTime;
        uint256 duration = auction.duration;
        if (elapsedTime >= duration) return (auction.token.tokenContract, auction.reservePrice);

        uint256 startPrice = auction.startPrice;
        uint256 priceDrop = (startPrice * elapsedTime) / duration;
        uint256 currentPrice = startPrice - priceDrop;
        if (currentPrice < auction.reservePrice) currentPrice = auction.reservePrice;
        return (auction.token.tokenContract, currentPrice);
    }

    /// @notice Returns the auction details
    /// @dev Throws if auction does not exist
    /// @param auctionId Auction id to be checked
    /// @return token Details of the token to be auctioned
    /// @return amount Amount of the token to be auctioned
    /// @return saleToken Address of the token that the auction is denominated in
    /// @return seller Address of the seller
    /// @return startPrice Starting price of the auction
    /// @return reservePrice Reserve price of the auction
    /// @return _feeBasisPoints Fee basis points of the auction
    /// @return royaltyRecipient Address of the royalty recipient
    /// @return royaltyBasisPoints Royalty basis points of the auction
    /// @return duration Duration of the auction
    /// @return startTime Start time of the auction
    function getAuction(
        uint256 auctionId
    )
        external
        view
        returns (
            Token memory token,
            uint256 amount,
            address saleToken,
            address seller,
            uint256 startPrice,
            uint256 reservePrice,
            uint16 _feeBasisPoints,
            address royaltyRecipient,
            uint16 royaltyBasisPoints,
            uint256 duration,
            uint256 startTime
        )
    {
        Auction storage auction = auctions[checkAuction(auctionId)];
        return (
            auction.token,
            auction.amount,
            auction.saleToken,
            auction.seller,
            auction.startPrice,
            auction.reservePrice,
            auction.feeBasisPoints,
            auction.royaltyRecipient,
            auction.royaltyBasisPoints,
            auction.duration,
            auction.startTime
        );
    }

    /// @notice Deletes the auction
    /// @param auctionId Auction id to be deleted
    function deleteAuction(uint256 auctionId) internal {
        delete auctions[auctionId].token;
        delete auctions[auctionId];
    }

    /// @notice Creates an auction
    /// @dev Throws if duration is zero
    /// @dev Throws if royalty basis points plus fee basis points is greater than denominator
    /// @param tokenContract Address of the token contract
    /// @param tokenId Id of the token being auctioned
    /// @param tokenType Type of the token being auctioned (0: ERC721, 1: ERC1155)
    /// @param amount Amount of the token being auctioned
    /// @param saleToken Address of the token that the auction is denominated in
    /// @param startPrice Starting price of the auction
    /// @param reservePrice Reserve price of the auction
    /// @param royaltyRecipient Address of the royalty recipient
    /// @param royaltyBasisPoints Royalty basis points of the auction
    /// @param duration Duration of the auction
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
    ) external returns (uint256 auctionId) {
        if (duration == 0) revert DurationCannotBeZero();
        if (royaltyBasisPoints + feeBasisPoints > DENOMINATOR)
            revert RoyaltyBasisPointsPlusFeeBasisPointsGreaterThanDenominator(
                DENOMINATOR,
                feeBasisPoints,
                royaltyBasisPoints
            );

        auctionId = nextAuctionId;
        nextAuctionId++;
        Token memory token = Token({ tokenContract: tokenContract, tokenId: tokenId, tokenType: tokenType });

        auctions[auctionId] = Auction({
            token: token,
            amount: amount,
            saleToken: saleToken,
            seller: msg.sender,
            startPrice: startPrice,
            reservePrice: reservePrice,
            feeBasisPoints: feeBasisPoints,
            royaltyRecipient: royaltyRecipient,
            royaltyBasisPoints: royaltyBasisPoints,
            duration: duration,
            startTime: block.timestamp
        });

        if (tokenType == TokenType.erc721) {
            IERC721(tokenContract).safeTransferFrom(msg.sender, address(this), tokenId);
        } else {
            IERC1155(tokenContract).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        }

        emit AuctionCreated(auctionId, token, saleToken, msg.sender, startPrice, reservePrice, duration);
    }

    /// @notice Buys the token in the given auction for the current price
    /// @dev Throws if auction does not exist
    /// @param auctionId Auction id to be bought
    function buy(uint256 auctionId) external {
        Auction storage auction = auctions[checkAuction(auctionId)];

        address seller = auction.seller;
        address saleToken = auction.saleToken;
        Token memory token = auction.token;
        (, uint256 currentPrice) = getCurrentPrice(auctionId);
        uint256 fee = 0;
        uint16 _feeBasisPoints = auction.feeBasisPoints;
        uint256 royalty = 0;
        uint16 royaltyBasisPoints = auction.royaltyBasisPoints;
        address royaltyRecipient = auction.royaltyRecipient;
        uint256 amount = auction.amount;

        deleteAuction(auctionId);

        if (_feeBasisPoints != 0) {
            fee = (currentPrice * _feeBasisPoints) / DENOMINATOR;
            IERC20(saleToken).safeTransferFrom(msg.sender, feeRecipient, fee);
        }

        if (royaltyBasisPoints != 0) {
            royalty = (currentPrice * royaltyBasisPoints) / DENOMINATOR;
            IERC20(saleToken).safeTransferFrom(msg.sender, royaltyRecipient, royalty);
        }

        IERC20(saleToken).safeTransferFrom(msg.sender, seller, (currentPrice - fee) - royalty);

        if (token.tokenType == TokenType.erc721) {
            IERC721(token.tokenContract).safeTransferFrom(address(this), msg.sender, token.tokenId);
            amount = 1;
        } else IERC1155(token.tokenContract).safeTransferFrom(address(this), msg.sender, token.tokenId, amount, "");

        emit AuctionSuccessful(auctionId, seller, msg.sender, token, amount, saleToken, currentPrice);
    }

    /// @notice Cancels the given auction
    /// @dev Throws if sender is not the seller
    /// @param auctionId Auction id to be cancelled
    function cancelAuction(uint256 auctionId) external {
        Auction storage auction = auctions[checkAuction(auctionId)];
        address seller = auction.seller;
        if (msg.sender != seller) revert OnlySellerCanCancel(seller);

        address tokenContract = auction.token.tokenContract;
        TokenType tokenType = auction.token.tokenType;
        uint256 tokenId = auction.token.tokenId;
        uint256 amount = auction.amount;

        deleteAuction(auctionId);

        if (tokenType == TokenType.erc721) IERC721(tokenContract).safeTransferFrom(address(this), seller, tokenId);
        else IERC1155(tokenContract).safeTransferFrom(address(this), seller, tokenId, amount, "");

        emit AuctionCancelled(auctionId, seller, tokenContract, tokenId);
    }

    /// @notice Recovers native tokens sent to the contract
    function recoverNativeTokens() external {
        payable(feeRecipient).transfer(address(this).balance);
    }

    /// @notice Recovers ERC20 tokens sent to the contract
    /// @param tokenContracts Addresses of the ERC20 tokens to be recovered
    function recoverERC20tokens(address[] memory tokenContracts) external {
        for (uint256 i = 0; i < tokenContracts.length; i++) {
            uint256 amount = IERC20(tokenContracts[i]).balanceOf(address(this));
            IERC20(tokenContracts[i]).safeTransfer(feeRecipient, amount);
        }
    }

    /// @notice Recovers ERC721 tokens sent to the contract
    /// @dev Throws if sender is not the owner
    /// @dev Throws if tokenContracts and tokenIds have different lengths
    /// @param tokenContracts Addresses of the ERC721 tokens to be recovered
    function recoverERC721tokens(address[] calldata tokenContracts, uint256[] calldata tokenIds) external onlyOwner {
        if (tokenContracts.length != tokenIds.length) revert InvalidLengths();
        for (uint256 i = 0; i < tokenContracts.length; i++) {
            IERC721(tokenContracts[i]).safeTransferFrom(address(this), feeRecipient, tokenIds[i]);
        }
    }

    /// @notice Recovers ERC1155 tokens sent to the contract
    /// @dev Throws if sender is not the owner
    /// @dev Throws if tokenContracts, tokenIds, or amounts have different lengths
    function recoverERC1155tokens(
        address[] calldata tokenContracts,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external onlyOwner {
        if (tokenContracts.length != tokenIds.length || tokenContracts.length != amounts.length)
            revert InvalidLengths();
        for (uint256 i = 0; i < tokenContracts.length; i++) {
            IERC1155(tokenContracts[i]).safeTransferFrom(address(this), feeRecipient, tokenIds[i], amounts[i], "");
        }
    }
}
