// contracts/Box.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts-ethereum-package/contracts/presets/ERC20PresetMinterPauser.sol";
import "./BinvesToken.sol";

contract BinvesTokenForUpgradeTest is BinvesToken {

    function newFunctionAfterUpgrades() public returns (bool){
        return true;
    }
}