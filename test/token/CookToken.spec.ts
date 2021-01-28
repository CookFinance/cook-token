import {ContractFactory} from "@ethersproject/contracts";
import {ethers, upgrades} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {CookToken} from "../../typechain";
import chai from "chai";

const {expect} = chai;

describe("CookToken", () => {
    let cookToken: CookToken;
    let initialTokenHolder: SignerWithAddress;
    let deployer: SignerWithAddress;
    let other: SignerWithAddress;
    const DEFAULT_ADMIN_ROLE: string = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const MINTER_ROLE: string = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
    const PAUSER_ROLE: string = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAUSER_ROLE"));
    const amount: string = '5000';
    const name: string = 'Cook Token';
    const symbol: string = 'COOK';
    const initialSupply = ethers.utils.parseEther('10000000000');

    beforeEach(async () => {
        const CookToken: ContractFactory = await ethers.getContractFactory("CookToken");
        const signers: SignerWithAddress[] = await ethers.getSigners();
        deployer = signers[0];
        initialTokenHolder = signers[1];
        other = signers[2];
        cookToken = await upgrades.deployProxy(CookToken, [await initialTokenHolder.getAddress()], {unsafeAllowCustomTypes: true}) as CookToken;
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

    it('has a name', async function () {
        expect(await cookToken.name()).to.equal(name);
    });

    it('has a symbol', async function () {
        expect(await cookToken.symbol()).to.equal(symbol);
    });

    it('has 18 decimals', async function () {
        expect((await cookToken.decimals()).toString()).to.equal('18');
    });

    describe('total supply', function () {
        it('returns the total amount of tokens', async function () {
            expect((await cookToken.totalSupply()).toString()).to.equal(initialSupply);
        });
    });

    describe('balanceOf', function () {
        describe('when the requested account has no tokens', function () {
            it('returns zero', async function () {
                expect((await cookToken.balanceOf(await other.getAddress())).toString()).to.equal('0');
            });
        });

        describe('when the requested account has some tokens', function () {
            it('returns the total amount of tokens', async function () {
                expect(await cookToken.balanceOf(await initialTokenHolder.getAddress())).to.equal(initialSupply);
            });
        });
    });

    describe('transfer', function () {
        describe('when the recipient is not the zero address', function () {
            describe('when the sender does not have enough balance', function () {
                const amount = initialSupply.add(1);
                it('reverts', async function () {
                    expect(cookToken.connect(initialTokenHolder).transfer(await other.getAddress(), amount)).to.be.revertedWith('ERC20: transfer amount exceeds balance')
                });
            });
        });

        describe('when the sender transfers all balance', function () {
            const amount = initialSupply;
            it('transfers the requested amount', async function () {
                await cookToken.connect(initialTokenHolder).transfer(await other.getAddress(), amount);
                expect(await cookToken.balanceOf(await initialTokenHolder.getAddress())).to.equal(0);
                expect(await cookToken.balanceOf(await other.getAddress())).to.equal(amount);
            });
        });
    });

    describe('minting', function () {
        it('deployer can mint tokens', async function () {
            expect(cookToken.mint(await other.getAddress(), amount)).to.emit(cookToken, 'Transfer').withArgs(ethers.constants.AddressZero, await other.getAddress(), amount);
            expect((await cookToken.balanceOf(await other.getAddress())).toString()).to.be.equal(amount);
        });

        it('other accounts cannot mint tokens', async function () {
            expect(cookToken.connect(initialTokenHolder).mint(await initialTokenHolder.getAddress(), amount)).to.be.revertedWith('CookToken: must have minter role to mint')
        });
    });

    describe('pausing', function () {
        it('deployer can pause', async function () {
            expect(cookToken.pause()).to.emit(cookToken, 'Paused').withArgs(await deployer.getAddress());
            expect(await cookToken.paused()).to.equal(true);
        });

        it('deployer can unpause', async function () {
            await cookToken.pause();
            expect(cookToken.unpause()).to.emit(cookToken, 'Unpaused').withArgs(await deployer.getAddress());
            expect(await cookToken.paused()).to.equal(false);
        });

        it('cannot mint while paused', async function () {
            await cookToken.pause();
            expect(cookToken.mint(await other.getAddress(), amount)).to.be.revertedWith('ERC20Pausable: token transfer while paused');
        });

        it('other accounts cannot pause', async function () {
            expect(cookToken.connect(other).pause()).to.be.revertedWith('CookToken: must have pauser role to pause');
        });
    });

    describe('burning', function () {
        it('holders can burn their tokens', async function () {
            await cookToken.mint(await other.getAddress(), amount);
            expect(cookToken.connect(other).burn('4999')).to.emit(cookToken, 'Transfer').withArgs(await other.getAddress(), ethers.constants.AddressZero, '4999');
            expect(await cookToken.balanceOf(await other.getAddress())).to.equal('1');
        });
    });
});