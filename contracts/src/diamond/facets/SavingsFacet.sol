//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";

contract SavingsFacet is VaultBase {
    event Deposit(address indexed user, uint256 amount, uint256 unlockTime);
    event Withdraw(address indexed user, uint256 amount);

    error ZeroAmount();
    error LockTooShort(uint256 given, uint256 minimum);
    error StillLocked(uint256 unlockTime);

    // User Functions

    function deposit(uint256 lockDuration) public payable {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();

        if (msg.value == 0) revert ZeroAmount();
        if (lockDuration < vs.minLockDuration)
            revert LockTooShort(lockDuration, vs.minLockDuration);

        LibVault.Savings storage s = vs.savings[msg.sender];

        uint256 newUnlock = uint256(block.timestamp + lockDuration);
        if (newUnlock > s.unlockTime) s.unlockTime = newUnlock;
        s.amount += msg.value;
        vs.totalSaved += msg.value;

        emit Deposit(msg.sender, msg.value, s.unlockTime);
    }

    function withdraw() public virtual nonReentrant {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[msg.sender];

        uint256 amount = s.amount;
        if (amount == 0) revert NothingSaved();
        if (block.timestamp < s.unlockTime) revert StillLocked(s.unlockTime);

        s.amount = 0;
        s.unlockTime = 0;
        vs.totalSaved -= amount;
        emit Withdraw(msg.sender, amount);

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }


    // Admin Functions
    function setMinLockDuration(uint256 newMin) external onlyOwner {
        LibVault.vaultStorage().minLockDuration = newMin;
    }

    // Read Functions

    function savings(
        address user
    ) external view returns (uint256 amount, uint64 unlockTime) {
        LibVault.Savings storage s = LibVault.vaultStorage().savings[user];
        return (s.amount, uint64(s.unlockTime));
    }

    function totalSaved() external view returns (uint256) {
        return LibVault.vaultStorage().totalSaved;
    }

    function minLockDuration() external view returns (uint256) {
        return LibVault.vaultStorage().minLockDuration;
    }

    function version() external view returns (string memory) {
        return LibVault.vaultStorage().version;
    }
}
