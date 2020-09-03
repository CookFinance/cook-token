// Load dependencies
const { web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { Contracts, ProxyAdminProject, ZWeb3 } = require('@openzeppelin/upgrades');

describe('BinvesToken', function () {
  const initialSupply = '100000000000000000000000000';

  beforeEach(async function () {
    // Initialize OpenZeppelin upgrades
    ZWeb3.initialize(web3.currentProvider);

    // Create an OpenZeppelin project
    const [binvesTeam] = await ZWeb3.eth.getAccounts();
    this.binvesTeam = binvesTeam;
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
});


// Logging
function log() {
  if (process.env.NODE_ENV !== 'test') {
    console.log.apply(this, arguments)
  }
}