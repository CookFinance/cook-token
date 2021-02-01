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
    let another: SignerWithAddress;
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
        another = signers[3];
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

            it('emits a transfer event', async function () {
                expect(cookToken.connect(initialTokenHolder).transfer(await other.getAddress(), amount)).to.emit(cookToken, 'Transfer').withArgs(await initialTokenHolder.getAddress(), await other.getAddress(), amount);
            });
        });

        describe('when the sender transfers zero tokens', function () {
            const amount = ethers.utils.parseEther('0');

            it('transfers the requested amount', async function () {
                await cookToken.connect(initialTokenHolder).transfer(await other.getAddress(), amount);
                expect(await cookToken.balanceOf(await initialTokenHolder.getAddress())).to.equal(initialSupply);
                expect(await cookToken.balanceOf(await other.getAddress())).to.equal(amount);
            });

            it('emits a transfer event', async function () {
                expect(cookToken.connect(initialTokenHolder).transfer(await other.getAddress(), amount)).to.emit(cookToken, 'Transfer').withArgs(await initialTokenHolder.getAddress(), await other.getAddress(), amount);
            });
        });

        describe('when the recipient is the zero address', function () {
            it('reverts', async function () {
                expect(cookToken.connect(initialTokenHolder).transfer(ethers.constants.AddressZero, initialSupply)).to.be.revertedWith('ERC20: transfer to the zero address')
            });
        });
    });

    describe('transfer from', function () {
        let spender: SignerWithAddress;
        beforeEach(async function () {
            spender = other;
        });
        describe('when the token owner is not the zero address', function () {
            let tokenOwner: SignerWithAddress;
            beforeEach(async function () {
                tokenOwner = initialTokenHolder;
            });
            describe('when the recipient is not the zero address', function () {
                let to: SignerWithAddress;

                beforeEach(async function () {
                    to = another;
                });

                describe('when the spender has enough approved balance', function () {
                    beforeEach(async function () {
                        await cookToken.connect(tokenOwner).approve(spender.address, initialSupply);
                    });

                    describe('when the token owner has enough balance', function () {
                        const amount = initialSupply;
                        it('transfers the requested amount', async function () {
                            await cookToken.connect(spender).transferFrom(tokenOwner.address, to.address, amount);
                            expect(await cookToken.balanceOf(tokenOwner.address)).to.equal('0');
                            expect(await cookToken.balanceOf(to.address)).to.equal(amount);
                        });

                        it('decreases the spender allowance', async function () {
                            await cookToken.connect(spender).transferFrom(tokenOwner.address, to.address, amount);
                            expect(await cookToken.allowance(tokenOwner.address, spender.address)).to.equal('0');
                        });

                        it('emits a transfer event', async function () {
                            expect(cookToken.connect(spender).transferFrom(tokenOwner.address, to.address, amount)).to.emit(cookToken, 'Transfer').withArgs(tokenOwner.address, to.address, amount)
                        });

                        it('emits an approval event', async function () {
                            expect(cookToken.connect(spender).transferFrom(tokenOwner.address, to.address, amount)).to.emit(cookToken, 'Approval').withArgs(tokenOwner.address, spender.address, await cookToken.allowance(tokenOwner.address, spender.address));
                        });
                    });

                    describe('when the token owner does not have enough balance', function () {
                        const amount = initialSupply.add(1);
                        it('reverts', async function () {
                            expect(cookToken.connect(spender).transferFrom(tokenOwner.address, to.address, amount)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
                        });
                    });
                });

                describe('when the spender does not have enough approved balance', function () {
                    beforeEach(async function () {
                        await cookToken.connect(tokenOwner).approve(spender.address, initialSupply.sub(1));
                    });

                    describe('when the token owner has enough balance', function () {
                        const amount = initialSupply;
                        it('reverts', async function () {
                            expect(cookToken.connect(spender).transferFrom(tokenOwner.address, to.address, amount)).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
                        });
                    });

                    describe('when the token owner does not have enough balance', function () {
                        const amount = initialSupply.add(1);

                        it('reverts', async function () {
                            expect(cookToken.connect(spender).transferFrom(tokenOwner.address, to.address, amount)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
                        });
                    });
                });
            });

            describe('when the recipient is the zero address', function () {
                const amount = initialSupply;
                const to = ethers.constants.AddressZero;

                beforeEach(async function () {
                    await cookToken.connect(tokenOwner).approve(spender.address, amount);
                });

                it('reverts', async function () {
                    expect(cookToken.connect(spender).transferFrom(tokenOwner.address, to, amount)).to.be.revertedWith('ERC20: transfer to the zero address');
                });
            });
        });

        describe('when the token owner is the zero address', function () {
            const amount = 0;
            const tokenOwner = ethers.constants.AddressZero;

            it('reverts', async function () {
                expect(cookToken.connect(spender).transferFrom(tokenOwner, another.address, amount)).to.be.revertedWith('ERC20: transfer from the zero address');
            });
        });
    });

    describe('approve', function () {
        let owner: SignerWithAddress;
        let spender: SignerWithAddress;

        beforeEach(async function () {
            owner = initialTokenHolder;
            spender = other;
        });

        describe('when the spender is not the zero address', function () {
            describe('when the sender has enough balance', function () {
                const amount = initialSupply;

                it('emits an approval event', async function () {
                    expect(cookToken.connect(owner).approve(spender.address, amount)).to.emit(cookToken, 'Approval').withArgs(owner.address, spender.address, amount);
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', async function () {
                        await cookToken.connect(owner).approve(spender.address, amount);
                        expect(await cookToken.allowance(owner.address, spender.address)).equal(amount);
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(async function () {
                        await cookToken.connect(owner).approve(spender.address, 1);
                    });

                    it('approves the requested amount and replaces the previous one', async function () {
                        await cookToken.connect(owner).approve(spender.address, amount);
                        expect(await cookToken.allowance(owner.address, spender.address)).equal(amount);
                    });
                });
            });

            describe('when the sender does not have enough balance', function () {
                const amount = initialSupply.add(1);

                it('emits an approval event', async function () {
                    expect(cookToken.connect(owner).approve(spender.address, amount)).to.emit(cookToken, 'Approval').withArgs(owner.address, spender.address, amount);
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', async function () {
                        await cookToken.connect(owner).approve(spender.address, amount);
                        expect(await cookToken.allowance(owner.address, spender.address)).equal(amount);
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(async function () {
                        await cookToken.connect(owner).approve(spender.address, 1);
                    });

                    it('approves the requested amount and replaces the previous one', async function () {
                        await cookToken.connect(owner).approve(spender.address, amount);
                        expect(await cookToken.allowance(owner.address, spender.address)).equal(amount);
                    });
                });
            });
        });

        describe('when the spender is the zero address', function () {
            it('reverts', async function () {
                expect(cookToken.connect(initialTokenHolder).approve(ethers.constants.AddressZero, initialSupply)).to.be.revertedWith('ERC20: approve to the zero address');
            });
        });
    });

    describe('decrease allowance', function () {
        describe('when the spender is not the zero address', function () {
            let initialHolder: SignerWithAddress;
            let spender: SignerWithAddress;
            beforeEach(async function () {
                initialHolder = initialTokenHolder;
                spender = other;
            });

            function shouldDecreaseApproval (amount: any) {
                describe('when there was no approved amount before', function () {
                    it('reverts', async function () {
                        expect(cookToken.connect(initialHolder).decreaseAllowance(spender.address, amount)).to.revertedWith('ERC20: decreased allowance below zero');
                    });
                });

                describe('when the spender had an approved amount', function () {
                    const approvedAmount = amount;

                    beforeEach(async function () {
                        await cookToken.connect(initialHolder).approve(spender.address, approvedAmount);
                    });

                    it('emits an approval event', async function () {
                        expect(cookToken.connect(initialHolder).decreaseAllowance(spender.address, approvedAmount)).to.emit(cookToken, 'Approval').withArgs(initialHolder.address, spender.address, 0);
                    });

                    it('decreases the spender allowance subtracting the requested amount', async function () {
                        await cookToken.connect(initialHolder).decreaseAllowance(spender.address, amount.sub(1));
                        expect(await cookToken.allowance(initialHolder.address, spender.address)).to.equal(1);
                    });

                    it('sets the allowance to zero when all allowance is removed', async function () {
                        await cookToken.connect(initialHolder).decreaseAllowance(spender.address, approvedAmount);
                        expect(await cookToken.allowance(initialHolder.address, spender.address)).to.equal(0);
                    });

                    it('reverts when more than the full allowance is removed', async function () {
                        expect(cookToken.connect(initialHolder).decreaseAllowance(spender.address, approvedAmount.add(1))).to.revertedWith('ERC20: decreased allowance below zero');
                    });
                });
            }

            describe('when the sender has enough balance', function () {
                shouldDecreaseApproval(initialSupply);
            });

            describe('when the sender does not have enough balance', function () {
                shouldDecreaseApproval(initialSupply.add(1));
            });
        });

        describe('when the spender is the zero address', function () {
            const amount = initialSupply;
            const spender = ethers.constants.AddressZero;

            it('reverts', async function () {
                expect(cookToken.connect(initialTokenHolder).decreaseAllowance(spender, amount)).revertedWith('ERC20: decreased allowance below zero');
            });
        });
    });

    describe('increase allowance', function () {
        const amount = ethers.utils.parseEther('5000');
        let initialHolder: SignerWithAddress;
        let spender: SignerWithAddress;

        beforeEach(async function () {
            initialHolder = initialTokenHolder;
            spender = other;
        });

        describe('when the spender is not the zero address', function () {

            describe('when the sender has enough balance', function () {
                it('emits an approval event', async function () {
                    expect(cookToken.connect(initialHolder).increaseAllowance(spender.address, amount)).emit(cookToken, 'Approval').withArgs(initialHolder.address, spender.address, amount);
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', async function () {
                        await cookToken.connect(initialHolder).increaseAllowance(spender.address, amount);
                        expect(await cookToken.allowance(initialHolder.address, spender.address)).equal(amount);
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(async function () {
                        await cookToken.connect(initialHolder).approve(spender.address, 1);
                    });

                    it('increases the spender allowance adding the requested amount', async function () {
                        await cookToken.connect(initialHolder).increaseAllowance(spender.address, amount);
                        expect(await cookToken.allowance(initialHolder.address, spender.address)).to.equal(amount.add(1));
                    });
                });
            });

            describe('when the sender does not have enough balance', function () {
                const amount = initialSupply.add(1);

                it('emits an approval event', async function () {
                    cookToken.connect(initialHolder).increaseAllowance(spender.address, amount);
                    expect(cookToken.connect(initialHolder).increaseAllowance(spender.address, amount)).emit(cookToken, 'Approval').withArgs(initialHolder.address, spender.address, amount);
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', async function () {
                        await cookToken.connect(initialHolder).increaseAllowance(spender.address, amount);
                        expect(await cookToken.allowance(initialHolder.address, spender.address)).equal(amount);
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(async function () {
                        await cookToken.connect(initialHolder).approve(spender.address, 1);
                    });

                    it('increases the spender allowance adding the requested amount', async function () {
                        await cookToken.connect(initialHolder).increaseAllowance(spender.address, amount);
                        expect(await cookToken.allowance(initialHolder.address, spender.address)).equal(amount.add(1));
                    });
                });
            });
        });

        describe('when the spender is the zero address', function () {
            const spender = ethers.constants.AddressZero;

            it('reverts', async function () {
                expect(cookToken.connect(initialHolder).increaseAllowance(spender, amount)).revertedWith('ERC20: approve to the zero address');
            });
        });
    });

    describe('_mint', function () {
        const amount = ethers.utils.parseEther('50');
        const ZERO_ADDRESS = ethers.constants.AddressZero;

        it('rejects a null account', async function () {
            expect(cookToken.mint(ZERO_ADDRESS,amount)).revertedWith('ERC20: mint to the zero address');
        });

        describe('for a non zero account', function () {
            beforeEach('minting', async function () {
                await cookToken.mint(other.address, amount);
            });

            it('increments totalSupply', async function () {
                const expectedSupply = initialSupply.add(amount);
                expect(await cookToken.totalSupply()).equal(expectedSupply);
            });

            it('increments recipient balance', async function () {
                expect(await cookToken.balanceOf(other.address)).equal(amount);
            });

            it('emits Transfer event', async function () {
                expect(cookToken.mint(other.address, amount)).emit(cookToken, 'Transfer').withArgs(ZERO_ADDRESS, other.address);
            });
        });
    });

    describe('_burn', function () {
        let initialHolder: SignerWithAddress;
        const ZERO_ADDRESS = ethers.constants.AddressZero;
        beforeEach('before', async function () {
            initialHolder = initialTokenHolder;
        });


        it('rejects a null account', async function () {
            expect(cookToken.connect(ZERO_ADDRESS).burn( 1)).revertedWith('ERC20: burn from the zero address');
        });

        describe('for a non zero account', function () {
            it('rejects burning more than balance', async function () {
                expect(cookToken.connect(initialTokenHolder).burn(initialSupply.add(1))).revertedWith('ERC20: burn amount exceeds balance');
            });

            const describeBurn = function (description: string, amount: any) {
                describe(description, function () {
                    beforeEach('burning', async function () {
                        await cookToken.connect(initialTokenHolder).burn(amount);
                    });

                    it('decrements totalSupply', async function () {
                        const expectedSupply = initialSupply.sub(amount);
                        expect(await cookToken.totalSupply()).equal(expectedSupply);
                    });

                    it('decrements initialHolder balance', async function () {
                        const expectedBalance = initialSupply.sub(amount);
                        expect(await cookToken.balanceOf(initialHolder.address)).equal(expectedBalance);
                    });

                    it('emits Transfer event', async function () {
                        expect(cookToken.connect(initialHolder).burn(amount)).emit(cookToken, 'Transfer').withArgs(initialHolder.address, ZERO_ADDRESS);
                    });
                });
            };

            describeBurn('for entire balance', initialSupply);
            describeBurn('for less amount than balance', initialSupply.sub(1));
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