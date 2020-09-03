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
    const project = new ProxyAdminProject('BinvesTokenProject', null, null, {binvesTeam});

    // Deploy a new BinvesToken contract
    log('Creating an upgradeable instance of BinvesToken');
    const BinvesToken = Contracts.getFromLocal('BinvesToken');
    this.contract = await project.createProxy(BinvesToken, {initArgs: [initialSupply]});
    const address = this.contract.options.address;
    log(`Contract created at ${address}`);

  });

  it('Contract owner should have all initial tokens', async function () {
    expect(await this.contract.methods.balanceOf(this.binvesTeam).call()).to.equal(initialSupply);
  });
});


// Logging
function log() {
  if (process.env.NODE_ENV !== 'test') {
    console.log.apply(this, arguments)
  }
}