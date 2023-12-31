import { ethers } from "hardhat";

import type { Bulbafloor } from "../../types/Bulbafloor";
import type { Bulbafloor__factory } from "../../types/factories/Bulbafloor__factory";

export async function deployBulbafloorFixture(): Promise<{ bulbafloor: Bulbafloor }> {
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const feeBasisPoints = 100;
  const feeCollector = signers[1];
  const royaltyRecipient = signers[2];
  const buyer = signers[3];

  const bulbafloorFactory = await ethers.getContractFactory("Bulbafloor");
  const bulbafloor = await bulbafloorFactory.connect(admin).deploy(admin, feeBasisPoints, feeCollector.address);
  await bulbafloor.waitForDeployment();

  const Erc20Factory = await ethers.getContractFactory("TestERC20");
  const Erc20 = await Erc20Factory.connect(admin).deploy(admin.address);
  await Erc20.waitForDeployment();
  await Erc20.mint(buyer.address, 1000000);
  await Erc20.connect(buyer).approve(bulbafloor.target, 10000000);

  const Erc721Factory = await ethers.getContractFactory("TestERC721");
  const Erc721 = await Erc721Factory.connect(admin).deploy(admin.address);
  await Erc721.waitForDeployment();
  await Erc721.safeMint(admin.address, 0);
  await Erc721.safeMint(admin.address, 1);

  const Erc1155Factory = await ethers.getContractFactory("TestERC1155");
  const Erc1155 = await Erc1155Factory.connect(admin).deploy(admin.address);
  await Erc1155.waitForDeployment();
  await Erc1155.mintBatch(admin.address, [0, 1], [1, 1], "0x");

  await Erc721.approve(bulbafloor.target, 0);
  await bulbafloor.createAuction(
    Erc721.target,
    0,
    0,
    0,
    Erc20.target,
    10000,
    250,
    royaltyRecipient.address,
    100,
    10000,
  );

  await Erc1155.setApprovalForAll(bulbafloor.target, true);
  await bulbafloor.createAuction(
    Erc1155.target,
    0,
    1,
    1,
    Erc20.target,
    10000,
    250,
    royaltyRecipient.address,
    100,
    10000,
  );

  return { bulbafloor, feeBasisPoints, feeCollector, royaltyRecipient, buyer, Erc20, Erc721, Erc1155 };
}
