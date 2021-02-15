import {ContractFactory} from "@ethersproject/contracts";
import {ethers, upgrades, run} from "hardhat";
import {CookToken} from "../typechain";

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    await run('compile');

    // We get the contract to deploy
    const CookToken: ContractFactory = await ethers.getContractFactory("CookToken");
    let cookToken: CookToken;
    let success: boolean = false;
    while (!success) {
        success = true;
        console.log('try to deploy');
        try {
            cookToken = await upgrades.deployProxy(CookToken, ["0x9cd6793E5C4944642aF6E49EA381975fC3A3a2E4"], {unsafeAllowCustomTypes: true}) as CookToken;
        }
        catch (error) {
            success = false;
        }
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });