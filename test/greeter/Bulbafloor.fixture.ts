import { ethers } from "hardhat";

import type { Bulbafloor } from "../../types/Bulbafloor";
import type { Bulbafloor__factory } from "../../types/factories/Bulbafloor__factory";

export async function deployBulbafloorFixture(): Promise<{ bulbafloor: Bulbafloor }> {
  const signers = await ethers.getSigners();
  const admin = signers[0];

  const greeting = "Hello, world!";
  const bulbafloorFactory = await ethers.getContractFactory("Bulbafloor");
  const bulbafloor = await bulbafloorFactory.connect(admin).deploy(greeting);
  await bulbafloor.waitForDeployment();

  return { bulbafloor };
}
