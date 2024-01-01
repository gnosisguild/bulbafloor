```
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
```

[![Github Actions][gha-badge]][gha] [![Test Coverage][coverage-badge]][coverage] [![Hardhat][hardhat-badge]][hardhat]
[![License: MIT][license-badge]][license]

[gha]: https://github.com/gnosisguild/bulbafloor/actions
[gha-badge]: https://github.com/gnosisguild/bulbafloor/actions/workflows/ci.yml/badge.svg
[hardhat]: https://hardhat.org/
[hardhat-badge]: https://img.shields.io/badge/Built%20with-Hardhat-FFDB1C.svg
[license]: https://opensource.org/license/lgpl-3-0/
[license-badge]: https://img.shields.io/badge/License-LGPLV3-blue.svg
[coverage]: https://coveralls.io/github/gnosisguild/bulbafloor?branch=main
[coverage-badge]: https://coveralls.io/repos/github/gnosisguild/bulbafloor/badge.svg?branch=main&cache_bust=1

# Bulbafloor 🌷

A decentralized auction platform for selling ERC721 and ERC1155 tokens in exchange for ERC20 tokens using a Dutch
auction mechanism.

## Overview

Bulbafloor allows users to create and participate in auctions for ERC721 and ERC1155 tokens. Sellers can list their
tokens, set starting prices, reserve prices, and auction durations. Buyers can bid on these tokens, and the auction
concludes when the reserve price is met or the auction duration expires.

## Features

- Supports both ERC721 and ERC1155 token types.
- Dutch auction mechanism for dynamic pricing.
- Ability to set starting prices and reserve prices.
- Sellers can choose the ERC20 token they wish to receive as payment.
- Fees and royalties can be configured for each auction.
- Fee collection and recovery functions.

## Configuration

- Adjust the `feeBasisPoints` and `feeRecipient` variables in the contract to customize fee settings.
- Set royalties and auction parameters when creating new auctions.

## License

This smart contract is licensed under the Lesser General Public License (LGPL-3.0-only). See LICENSE for details.

## Acknowledgments

Made with ❤️ by Gnosis Guild.

### Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
PURPOSE.
