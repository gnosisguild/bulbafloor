import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:buyNFT")
  .addParam("auction", "ID of the auction to buy")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const Bulbafloor = await deployments.get("Bulbafloor");

    const signers = await ethers.getSigners();

    const bulbafloor = await ethers.getContractAt("Bulbafloor", Bulbafloor.address);

    await bulbafloor.buy(taskArguments.greeting);

    console.log("NFT purchased 🎉");
  });
