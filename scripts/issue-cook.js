// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  await hre.run('compile');

  // We get the contract to deploy
  const Cook = await hre.ethers.getContractFactory("Cook");
  const cook = await Cook.deploy("0x4026fe27Bc3a66C5dCb38D502212109caB0aB23a", "0x4026fe27Bc3a66C5dCb38D502212109caB0aB23a", 1801443600);

  await cook.deployed();

  console.log("Cook deployed to:", cook.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });