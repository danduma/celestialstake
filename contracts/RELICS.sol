// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RELICS is ERC20 {
    address public admin;

    constructor(uint256 initialSupply) ERC20("RELICS", "RELICS") {
        _mint(msg.sender, initialSupply);
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Caller is not the admin");
        _;
    }

    /**
     *  Allows updating the admin of the contract
     */
    function transferAdmin(address newadmin) public onlyAdmin {
        admin = newadmin;
    }
    
    /**
     *  External function to mint more RELICS
     */
    function mintToReceiver(address receiver, uint256 amount) public onlyAdmin {
        _mint(receiver, amount);
    }

}
