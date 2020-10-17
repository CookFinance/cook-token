// contracts/Box.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts-ethereum-package/contracts/presets/ERC20PresetMinterPauser.sol";

contract CookToken is ERC20PresetMinterPauserUpgradeSafe {
    function initialize(uint256 initialSupply) public initializer {
        initialize("Cook", "COK");
        _mint(_msgSender(), initialSupply);
    }
}