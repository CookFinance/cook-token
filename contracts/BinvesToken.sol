// contracts/Box.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";

contract BinvesToken is ERC20, ERC20Burnable {
    constructor(uint256 initialSupply) public ERC20("Binves", "BIN") {
        _mint(msg.sender, initialSupply);
    }
}