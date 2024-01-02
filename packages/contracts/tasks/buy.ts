import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:buyNFT")
  .addParam("auction", "ID of the auction to buy", undefined, types.int, false)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const Bulbafloor = await deployments.get("Bulbafloor");

    const bulbafloor = await ethers.getContractAt("Bulbafloor", Bulbafloor.address);

    await bulbafloor.buy(taskArguments.auction);

    console.log("NFT purchased 🎉");
  });
