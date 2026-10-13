// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

error sendFailed();

contract VulnerableVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "nothing to withdraw");

        balances[msg.sender] = 0;

        (bool ok,) = msg.sender.call{value: amount}("");   // 1. sends the ETH
        require(ok, "send failed");

        if (!ok) revert sendFailed() ;// 2. updates the record (TOO LATE)
    }
}

// function pause();