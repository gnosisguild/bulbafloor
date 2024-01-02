import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const bulbafloor = await deploy("Bulbafloor", {
    from: deployer,
    args: ["Bonjour, le monde!"],
    log: true,
  });

  console.log(`Bulbafloor contract: `, bulbafloor.address);
};
export default func;
func.id = "deploy_bulbafloor"; // id required to prevent reexecution
func.tags = ["Bulbafloor"];
