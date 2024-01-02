import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/dist/src/signer-with-address";

import type { Bulbafloor } from "../types/Bulbafloor";

type Fixture<T> = () => Promise<T>;

declare module "mocha" {
  export interface Context {
    bulbafloor: Bulbafloor;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
  }
}

export interface Signers {
  admin: SignerWithAddress;
  feeRecipient: SignerWithAddress;
  royaltyRecipient: SignerWithAddress;
  buyer: SignerWithAddress;
}
