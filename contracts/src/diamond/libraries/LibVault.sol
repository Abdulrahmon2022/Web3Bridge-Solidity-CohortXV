//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibVault {

    // The slot where the storage of the vault 
    bytes32 constant STORAGE_POSITION = keccak256("web3bridge.diamond.vault.storage");

    struct Savings {
        uint256 amount;
        uint256 unlockTime;
    }

    struct VaultStorage {
        mapping(address => Savings) savings;
        uint256 totalSaved;
        uint256 minLockDuration;
        string version;
        uint256 reentrancyLock;

    }

    function vaultStorage() internal pure returns (VaultStorage storage vs) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            vs.slot := position
        }
    }


}