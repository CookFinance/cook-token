// Load dependencies
const { web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { Contracts, ProxyAdminProject, ZWeb3 } = require('@openzeppelin/upgrades');
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

describe('BinvesToken', function () {
  const initialSupply = '100000000000000000000000000';
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const MINTER_ROLE = web3.utils.soliditySha3('MINTER_ROLE');
  const PAUSER_ROLE = web3.utils.soliditySha3('PAUSER_ROLE');
  const amount = '5000';
  const burnAmount = '4999';
  const {ZERO_ADDRESS} = constants;
  const errorPrefix = 'ERC20';

  beforeEach(async function () {
    // Initialize OpenZeppelin upgrades
    ZWeb3.initialize(web3.currentProvider);

    // Create an OpenZeppelin project
    const [binvesTeam, other, another] = await ZWeb3.eth.getAccounts();
    this.binvesTeam = binvesTeam;
    this.other = other;
    this.another = another;
    this.project = new ProxyAdminProject('BinvesTokenProject', null, null, {binvesTeam});

    // Deploy a new BinvesToken contract
    log('Creating an upgradeable instance of BinvesToken');
    const BinvesToken = Contracts.getFromLocal('BinvesToken');
    this.contract = await this.project.createProxy(BinvesToken, {initArgs: [initialSupply]});
    this.address = this.contract.options.address;
    log(`Contract created at ${this.address}`);

  });

  it('Contract owner should have all initial tokens', async function () {
    const binvesTeamBalnce = await this.contract.methods.balanceOf(this.binvesTeam).call();
    expect(binvesTeamBalnce).to.equal(initialSupply);
  });

  it('Contract should be upgradable', async function () {
    // Upgrade the contract
    log('Upgrading the contract');
    const BinvesTokenForUpgradeTest = Contracts.getFromLocal('BinvesTokenForUpgradeTest');
    const upgradedContract = await this.project.upgradeProxy(this.address, BinvesTokenForUpgradeTest);
    log(`Contract upgraded at ${upgradedContract.options.address}`);

    // Check new newFunctionAfterUpgrades method
    const newFunctionAfterUpgradesReturnValue = await upgradedContract.methods.newFunctionAfterUpgrades().call();
    expect(newFunctionAfterUpgradesReturnValue).to.equal(true);

    // Make sure state in previous contract is kept
    const binvesTeamBalnce = await upgradedContract.methods.balanceOf(this.binvesTeam).call();
    expect(binvesTeamBalnce).to.equal(initialSupply);
  });

  it('Deployer has the default admin role', async function () {
    expect(await this.contract.methods.getRoleMemberCount(DEFAULT_ADMIN_ROLE).call()).to.be.bignumber.equal('1');
    expect(await this.contract.methods.getRoleMember(DEFAULT_ADMIN_ROLE, 0).call()).to.equal(this.binvesTeam);
  });

  it('Deployer has the minter role', async function () {
    expect(await this.contract.methods.getRoleMemberCount(MINTER_ROLE).call()).to.be.bignumber.equal('1');
    expect(await this.contract.methods.getRoleMember(MINTER_ROLE, 0).call()).to.equal(this.binvesTeam);
  });

  it('Deployer has the pauser role', async function () {
    expect(await this.contract.methods.getRoleMemberCount(PAUSER_ROLE).call()).to.be.bignumber.equal('1');
    expect(await this.contract.methods.getRoleMember(PAUSER_ROLE, 0).call()).to.equal(this.binvesTeam);
  });

  it('Minter and pauser role admin is the default admin', async function () {
    expect(await this.contract.methods.getRoleAdmin(MINTER_ROLE).call()).to.equal(DEFAULT_ADMIN_ROLE);
    expect(await this.contract.methods.getRoleAdmin(PAUSER_ROLE).call()).to.equal(DEFAULT_ADMIN_ROLE);
  });

  describe('Minting', function () {
    it('Deployer can mint tokens', async function () {
      const receipt = await this.contract.methods.mint(this.other, amount).send({from: this.binvesTeam});
      expectEvent(receipt, 'Transfer', { from: ZERO_ADDRESS, to: this.other, value: amount });
      expect(await this.contract.methods.balanceOf(this.other).call()).to.be.bignumber.equal(amount);
    });

    it('Other accounts cannot mint tokens', async function () {
      await expectRevert(
        this.contract.methods.mint(this.other, amount).send({ from: this.other }),
        'ERC20PresetMinterPauser: must have minter role to mint'
      );
    });
  });

  describe('Pausing', function () {
    it('Deployer can pause', async function () {
      const receipt = await this.contract.methods.pause().send({ from: this.binvesTeam });
      expectEvent(receipt, 'Paused', { account: this.binvesTeam });

      expect(await this.contract.methods.paused().call()).to.equal(true);
    });

    it('Deployer can unpause', async function () {
      await this.contract.methods.pause().send({ from: this.binvesTeam });

      const receipt = await this.contract.methods.unpause().send({ from: this.binvesTeam });
      expectEvent(receipt, 'Unpaused', { account: this.binvesTeam });

      expect(await this.contract.methods.paused().call()).to.equal(false);
    });

    it('Cannot mint while paused', async function () {
      await this.contract.methods.pause().send({ from: this.binvesTeam });

      await expectRevert(
        this.contract.methods.mint(this.other, amount).send({ from: this.binvesTeam }),
        'ERC20Pausable: token transfer while paused'
      );
    });

    it('Other accounts cannot pause', async function () {
      await expectRevert(this.contract.methods.pause().send({ from: this.other }), 'ERC20PresetMinterPauser: must have pauser role to pause');
    });
  });

  describe('burning', function () {
    it('holders can burn their tokens', async function () {
      await this.contract.methods.mint(this.other, amount).send({ from: this.binvesTeam });

      const receipt = await this.contract.methods.burn(burnAmount).send({ from: this.other });
      expectEvent(receipt, 'Transfer', { from: this.other, to: ZERO_ADDRESS, value: burnAmount });

      expect(await this.contract.methods.balanceOf(this.other).call()).to.be.bignumber.equal('1');
    });
  });

  it('Has a name', async function () {
    expect(await this.contract.methods.name().call()).to.equal("Binves");
  });

  it('has a symbol', async function () {
    expect(await this.contract.methods.symbol().call()).to.equal("BIN");
  });

  it('has 18 decimals', async function () {
    expect(await this.contract.methods.decimals().call()).to.be.bignumber.equal('18');
  });

  describe('Total supply', function () {
    it('returns the total amount of tokens', async function () {
      expect(await this.contract.methods.totalSupply().call()).to.be.bignumber.equal(initialSupply);
    });
  });

  describe('BalanceOf', function () {
    describe('When the requested account has no tokens', function () {
      it('Returns zero', async function () {
        expect(await this.contract.methods.balanceOf(this.other).call()).to.be.bignumber.equal('0');
      });
    });

    describe('When the requested account has some tokens', function () {
      it('Returns the total amount of tokens', async function () {
        expect(await this.contract.methods.balanceOf(this.binvesTeam).call()).to.be.bignumber.equal(initialSupply);
      });
    });
  });

  describe('Transfer', function () {
    describe('When the recipient is not the zero address', function () {
      describe('When the sender does not have enough balance', function () {
        const amount = new BN(initialSupply).addn(1).toString();
        it('Reverts', async function () {
          await expectRevert(this.contract.methods.transfer(this.other, amount).send({from: this.binvesTeam}),
            `${errorPrefix}: transfer amount exceeds balance`
          );
        });
      });

      describe('When te sender transfers all balance', function () {
        const amount = initialSupply;

        it('Transfers the requested amount', async function () {
          await this.contract.methods.transfer(this.other, amount).send({from: this.binvesTeam});

          expect(await this.contract.methods.balanceOf(this.binvesTeam).call()).to.be.bignumber.equal('0');

          expect(await this.contract.methods.balanceOf(this.other).call()).to.be.bignumber.equal(amount);
        });

        it('Emits a transfer event', async function () {
          const receiopt = await this.contract.methods.transfer(this.other, amount).send({from: this.binvesTeam});
          expectEvent(receiopt, 'Transfer', {
            from: this.binvesTeam,
            to: this.other,
            value: amount,
          });
        });
      });

      describe('When the sender transfers zero tokens', function () {
        const amount = new BN('0').toString();

        it('Transfers the requested amount', async function () {
          await this.contract.methods.transfer(this.other, amount).send({from: this.binvesTeam});

          expect(await this.contract.methods.balanceOf(this.binvesTeam).call()).to.be.bignumber.equal(initialSupply);

          expect(await this.contract.methods.balanceOf(this.other).call()).to.be.bignumber.equal('0');
        });

        it('Emits a transfer event', async function () {
          const receiopt = await this.contract.methods.transfer(this.other, amount).send({from: this.binvesTeam});

          expectEvent(receiopt, 'Transfer', {
            from: this.binvesTeam,
            to: this.other,
            value: amount,
          });
        });
      });
    });

    describe('When the recipient is the zero address', function () {
      it('Reverts', async function () {
        await expectRevert(this.contract.methods.transfer(ZERO_ADDRESS, initialSupply).send({from: this.binvesTeam}),
          `${errorPrefix}: transfer to the zero address`
        );
      });
    });

    describe('Tansfer from', function () {

      describe('When the token owner is not the zero address', function () {

        describe('When the recipient is not the zero address', function () {

          describe('when the spender has enough approved balance', function () {
            beforeEach(async function () {
              await this.contract.methods.approve(this.other, initialSupply).send({ from: this.binvesTeam });
            });

            describe('When the token owner has enough balance', function () {
              const amount = initialSupply;

              it('Transfers the requested amount', async function () {
                await this.contract.methods.transferFrom(this.binvesTeam, this.another, amount).send({ from: this.other });

                expect(await this.contract.methods.balanceOf(this.binvesTeam).call()).to.be.bignumber.equal('0');

                expect(await this.contract.methods.balanceOf(this.another).call()).to.be.bignumber.equal(amount);
              });

              it('Decreases the spender allowance', async function () {
                await this.contract.methods.transferFrom(this.binvesTeam, this.another, amount).send({ from: this.other });

                expect(await this.contract.methods.allowance(this.binvesTeam, this.other).call()).to.be.bignumber.equal('0');
              });

              it('Emits a transfer event', async function () {
                const receipt = await this.contract.methods.transferFrom(this.binvesTeam, this.another, amount).send({ from: this.other });

                expectEvent(receipt, 'Transfer', {
                  from: this.binvesTeam,
                  to: this.another,
                  value: amount,
                });
              });

              it('Emits an approval event', async function () {
                const receipt = await this.contract.methods.transferFrom(this.binvesTeam, this.another, amount).send({ from: this.other });

                expectEvent(receipt, 'Approval', {
                  owner: this.binvesTeam,
                  spender: this.other,
                  value: await this.contract.methods.allowance(this.binvesTeam, this.other).call(),
                });
              });
            });

            describe('When the token owner does not have enough balance', function () {
              const amount = new BN(initialSupply).addn(1).toString();

              it('reverts', async function () {
                await expectRevert(this.contract.methods.transferFrom(
                  this.binvesTeam, this.another, amount).send({ from: this.other }), `${errorPrefix}: transfer amount exceeds balance`
                );
              });
            });
          });

          describe('When the spender does not have enough approved balance', function () {
            beforeEach(async function () {
              await this.contract.methods.approve(this.other, new BN(initialSupply).subn(1).toString()).send({ from: this.binvesTeam });
            });

            describe('When the token owner has enough balance', function () {
              const amount = initialSupply;

              it('Reverts', async function () {
                await expectRevert(this.contract.methods.transferFrom(
                  this.binvesTeam, this.another, amount).send({ from: this.other }), `${errorPrefix}: transfer amount exceeds allowance`
                );
              });
            });

            describe('When the token owner does not have enough balance', function () {
              const amount = new BN(initialSupply).addn(1).toString();

              it('reverts', async function () {
                await expectRevert(this.contract.methods.transferFrom(
                  this.binvesTeam, this.another, amount).send({ from: this.other }), `${errorPrefix}: transfer amount exceeds balance`
                );
              });
            });
          });
        });

        describe('When the recipient is the zero address', function () {
          const amount = initialSupply;
          const to = ZERO_ADDRESS;

          beforeEach(async function () {
            await this.contract.methods.approve(this.other, amount).send({ from: this.binvesTeam });
          });

          it('Reverts', async function () {
            await expectRevert(this.contract.methods.transferFrom(
              this.binvesTeam, to, amount).send({ from: this.other }), `${errorPrefix}: transfer to the zero address`
            );
          });
        });
      });

      describe('When the token owner is the zero address', function () {
        const amount = 0;
        const tokenOwner = ZERO_ADDRESS;

        it('reverts', async function () {
          await expectRevert(this.contract.methods.transferFrom(
            tokenOwner, this.another, amount).send({ from: this.other }), `${errorPrefix}: transfer from the zero address`
          );
        });
      });
    });

    describe('Approve', function () {

      describe('When the spender is not the zero address', function () {
        describe('When the sender has enough balance', function () {
          const amount = initialSupply;

          it('Emits an approval event', async function () {
            const receipt = await this.contract.methods.approve(this.other, amount).send({ from: this.binvesTeam });

            expectEvent(receipt, 'Approval', {
              owner: this.binvesTeam,
              spender: this.other,
              value: amount,
            });
          });

          describe('When there was no approved amount before', function () {
            it('Approves the requested amount', async function () {
              await this.contract.methods.approve(this.other, amount).send({ from: this.binvesTeam });

              expect(await this.contract.methods.allowance(this.binvesTeam, this.other).call()).to.be.bignumber.equal(amount);
            });
          });

          describe('When the spender had an approved amount', function () {
            beforeEach(async function () {
              await this.contract.methods.approve(this.other, new BN(1).toString()).send({ from: this.binvesTeam });
            });

            it('approves the requested amount and replaces the previous one', async function () {
              await this.contract.methods.approve(this.other, amount).send({ from: this.binvesTeam });

              expect(await this.contract.methods.allowance(this.binvesTeam, this.other).call()).to.be.bignumber.equal(amount);
            });
          });
        });

        describe('When the sender does not have enough balance', function () {
          const amount = new BN(initialSupply).addn(1).toString();

          it('Emits an approval event', async function () {
            const receipt = await this.contract.methods.approve(this.other, amount).send({ from: this.binvesTeam });

            expectEvent(receipt, 'Approval', {
              owner: this.binvesTeam,
              spender: this.other,
              value: amount,
            });
          });

          describe('When there was no approved amount before', function () {
            it('Approves the requested amount', async function () {
              await this.contract.methods.approve(this.other, amount).send({ from: this.binvesTeam });

              expect(await this.contract.methods.allowance(this.binvesTeam, this.other).call()).to.be.bignumber.equal(amount);
            });
          });

          describe('When the spender had an approved amount', function () {
            beforeEach(async function () {
              await this.contract.methods.approve(this.other, new BN(1).toString()).send({ from: this.binvesTeam });
            });

            it('Approves the requested amount and replaces the previous one', async function () {
              await this.contract.methods.approve(this.other, amount).send({ from: this.binvesTeam });

              expect(await this.contract.methods.allowance(this.binvesTeam, this.other).call()).to.be.bignumber.equal(amount);
            });
          });
        });
      });

      describe('When the spender is the zero address', function () {
        it('Reverts', async function () {
          await expectRevert(this.contract.methods.approve(ZERO_ADDRESS, initialSupply).send({ from: this.binvesTeam }),
            `${errorPrefix}: approve to the zero address`
          );
        });
      });
    });
  });

  describe('Decrease allowance', function () {
    describe('When the spender is not the zero address', function () {

      function shouldDecreaseApproval (amount) {
        describe('When there was no approved amount before', function () {
          it('Reverts', async function () {
            await expectRevert(this.contract.methods.decreaseAllowance(
              this.other, amount).send({ from: this.binvesTeam }), 'ERC20: decreased allowance below zero'
            );
          });
        });

        describe('When the spender had an approved amount', function () {
          const approvedAmount = amount;

          beforeEach(async function () {
            (this.receipt = await this.contract.methods.approve(this.other, approvedAmount).send({ from: this.binvesTeam }));
          });

          it('Emits an approval event', async function () {
            const receipt = await this.contract.methods.decreaseAllowance(this.other, approvedAmount).send({ from: this.binvesTeam });

            expectEvent(receipt, 'Approval', {
              owner: this.binvesTeam,
              spender: this.other,
              value: new BN(0).toString(),
            });
          });

          it('Decreases the spender allowance subtracting the requested amount', async function () {
            await this.contract.methods.decreaseAllowance(this.other, new BN(approvedAmount).subn(1).toString()).send({ from: this.binvesTeam });

            expect(await this.contract.methods.allowance(this.binvesTeam, this.other).call()).to.be.bignumber.equal('1');
          });

          it('Sets the allowance to zero when all allowance is removed', async function () {
            await this.contract.methods.decreaseAllowance(this.other, approvedAmount).send({ from: this.binvesTeam });
            expect(await this.contract.methods.allowance(this.binvesTeam, this.other).call()).to.be.bignumber.equal('0');
          });

          it('Reverts when more than the full allowance is removed', async function () {
            await expectRevert(
              this.contract.methods.decreaseAllowance(this.other, new BN(approvedAmount).addn(1).toString()).send({ from: this.binvesTeam }),
              'ERC20: decreased allowance below zero'
            );
          });
        });
      }

      describe('When the sender has enough balance', function () {
        shouldDecreaseApproval(initialSupply);
      });

      describe('When the sender does not have enough balance', function () {
        shouldDecreaseApproval(new BN(initialSupply).addn(1).toString());
      });
    });

    describe('When the spender is the zero address', function () {
      const amount = initialSupply;
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await expectRevert(this.contract.methods.decreaseAllowance(
          spender, amount).send({ from: this.binvesTeam }), 'ERC20: decreased allowance below zero'
        );
      });
    });
  });
});


// Logging
function log() {
  if (process.env.NODE_ENV !== 'test') {
    console.log.apply(this, arguments)
  }
};