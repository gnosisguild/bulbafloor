import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:deployBulbafloor")
  .addParam("owner", "Initial owner of the contract", undefined, types.string, true)
  .addParam("fee", "Fee basis points", 100, types.int, true)
  .addParam("recipient", "Fee recipient", undefined, types.string, true)
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers = await ethers.getSigners();
    console.log(signers[0].address);
    const initialOwner: string = taskArguments.owner || signers[0].address;
    const feeBasisPoints: number = taskArguments.fee;
    const feeRecipient: string = taskArguments.recipient || signers[0].address;
    const bulbafloorFactory = await ethers.getContractFactory("Bulbafloor");
    const bulbafloor = await bulbafloorFactory.connect(signers[0]).deploy(initialOwner, feeBasisPoints, feeRecipient);
    await bulbafloor.waitForDeployment();
    console.log("Bulbafloor deployed to: ", await bulbafloor.getAddress());
  });
