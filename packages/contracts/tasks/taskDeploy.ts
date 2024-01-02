import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:deployBulbafloor")
  .addParam("greeting", "Say hello, be nice")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers = await ethers.getSigners();
    const bulbafloorFactory = await ethers.getContractFactory("Bulbafloor");
    const bulbafloor = await bulbafloorFactory.connect(signers[0]).deploy(taskArguments.greeting);
    await bulbafloor.waitForDeployment();
    console.log("Bulbafloor deployed to: ", await bulbafloor.getAddress());
  });
