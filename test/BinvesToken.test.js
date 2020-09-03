// Load dependencies
const { web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { Contracts, ProxyAdminProject, ZWeb3 } = require('@openzeppelin/upgrades');
const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

describe('BinvesToken', function () {
  const initialSupply = '100000000000000000000000000';
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const MINTER_ROLE = web3.utils.soliditySha3('MINTER_ROLE');
  const PAUSER_ROLE = web3.utils.soliditySha3('PAUSER_ROLE');
  const amount = '5000';
  const { ZERO_ADDRESS } = constants;

  beforeEach(async function () {
    // Initialize OpenZeppelin upgrades
    ZWeb3.initialize(web3.currentProvider);

    // Create an OpenZeppelin project
    const [binvesTeam, other] = await ZWeb3.eth.getAccounts();
    this.binvesTeam = binvesTeam;
    this.other = other;
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
});


// Logging
function log() {
  if (process.env.NODE_ENV !== 'test') {
    console.log.apply(this, arguments)
  }
}