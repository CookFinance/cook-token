import { ethers, upgrades } from "hardhat";
import chai from "chai";
import {CookToken, CookTokenForUpgradeTest} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {ContractFactory} from "@ethersproject/contracts";

const { expect } = chai;

describe("CookToken (proxy)", () => {
    let cookToken: CookToken;
    let initialTokenHolder: SignerWithAddress;

    beforeEach(async () => {
        const CookToken: ContractFactory = await ethers.getContractFactory("CookToken");
        const signers: SignerWithAddress[] = await ethers.getSigners();
        initialTokenHolder = signers[1];
        cookToken = await upgrades.deployProxy(CookToken, [await initialTokenHolder.getAddress()], { unsafeAllowCustomTypes: true }) as CookToken;
    });

    it('retrieve returns a value previously initialized', async function () {
        // Test if the returned value is the same one
        expect((await cookToken.balanceOf(await initialTokenHolder.getAddress())).toString()).to.equal(ethers.utils.parseEther('10000000000'));
    });

    it('upgrade token contract', async function () {
        const cookTokenAddress: String = cookToken.address;
        const CookTokenForUpgradeTest: ContractFactory = await ethers.getContractFactory("CookTokenForUpgradeTest");
        const cookTokenForUpgradeTest: CookTokenForUpgradeTest = await upgrades.upgradeProxy(cookToken.address, CookTokenForUpgradeTest, { unsafeAllowCustomTypes: true }) as CookTokenForUpgradeTest;
        expect(await cookTokenForUpgradeTest.upgradeTest()).to.equal("upgrade successfully");
        expect(cookTokenForUpgradeTest.address).to.equal(cookTokenAddress);
    });
});