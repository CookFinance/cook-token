// Load dependencies
const { accounts, contract } = require('@openzeppelin/test-environment');
const { expect } = require('chai');

// Load compiled artifacts
const BinvesToken = contract.fromArtifact('BinvesToken');

describe('BinvesToken', function () {
  const [ owner ] = accounts;
  const initialSupply = '100000000000000000000';

  beforeEach(async function () {
    // Deploy a new BinvesToken contract for each test
    this.contract = await BinvesToken.new(initialSupply, { from: owner });
  });

  it('Contract owner should have all initial tokens', async function () {
    expect((await this.contract.balanceOf.call(owner)).toString()).to.equal(initialSupply);
  });
});