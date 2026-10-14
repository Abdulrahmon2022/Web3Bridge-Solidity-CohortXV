//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";
import {VaultBase} from "../VaultBase.sol";

contract EmergencyFacet is VaultBase {
	error NoFundsToWithdraw();

	event EmergencyWithdrawal(address indexed owner, uint256 amount, uint256 fee);

	function emergencyWithdraw() external onlyOwner nonReentrant {
		uint256 balance = address(this).balance;
		if (balance == 0) revert NoFundsToWithdraw();

		uint256 fee = balance / 10;
		uint256 amount = balance - fee;
		address payable owner = payable(LibDiamond.contractOwner());

		(bool ok, ) = owner.call{value: amount}("");
		if (!ok) revert TransferFailed();

		emit EmergencyWithdrawal(owner, amount, fee);
	}
}
