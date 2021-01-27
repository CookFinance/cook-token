import {ContractFactory} from "@ethersproject/contracts";
import {ethers, upgrades} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {CookToken} from "../../typechain";
import chai from "chai";

const { expect } = chai;

describe("CookToken (proxy)", () => {
    let cookToken: CookToken;
    let initialTokenHolder: SignerWithAddress;
    let deployer: SignerWithAddress;
    let other: SignerWithAddress;
    const DEFAULT_ADMIN_ROLE: string = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const MINTER_ROLE: string = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
    const PAUSER_ROLE: string = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAUSER_ROLE"));
    const amount: string = '5000';

    beforeEach(async () => {
        const CookToken: ContractFactory = await ethers.getContractFactory("CookToken");
        const signers: SignerWithAddress[] = await ethers.getSigners();
        deployer = signers[0];
        initialTokenHolder = signers[1];
        other = signers[2];
        cookToken = await upgrades.deployProxy(CookToken, [await initialTokenHolder.getAddress()], { unsafeAllowCustomTypes: true }) as CookToken;
    });

    it('deployer has the default admin role', async function () {
        expect(await cookToken.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).to.equal('1');
        expect(await cookToken.getRoleMember(DEFAULT_ADMIN_ROLE, 0)).to.equal(await deployer.getAddress());
    });

    it('deployer has the minter role', async function () {
        expect(await cookToken.getRoleMemberCount(MINTER_ROLE)).to.equal('1');
        expect(await cookToken.getRoleMember(MINTER_ROLE, 0)).to.equal(await deployer.getAddress());
    });

    it('deployer has the pauser role', async function () {
        expect(await cookToken.getRoleMemberCount(PAUSER_ROLE)).to.equal('1');
        expect(await cookToken.getRoleMember(PAUSER_ROLE, 0)).to.equal(await deployer.getAddress());
    });

    it('minter and pauser role admin is the default admin', async function () {
        expect(await cookToken.getRoleAdmin(MINTER_ROLE)).to.equal(DEFAULT_ADMIN_ROLE);
        expect(await cookToken.getRoleAdmin(PAUSER_ROLE)).to.equal(DEFAULT_ADMIN_ROLE);
    });

    describe('minting', function () {
        it('deployer can mint tokens', async function () {
            expect(cookToken.mint(await other.getAddress(), amount)).to.emit(cookToken, 'Transfer').withArgs(ethers.constants.AddressZero, await other.getAddress(), amount);
            expect((await cookToken.balanceOf(await other.getAddress())).toString()).to.be.equal(amount);
        });

        it('other accounts cannot mint tokens', async function () {
            expect(cookToken.connect(initialTokenHolder).mint(await initialTokenHolder.getAddress(), amount)).to.be.revertedWith('ERC20PresetMinterPauser: must have minter role to mint')
        });
    });
});