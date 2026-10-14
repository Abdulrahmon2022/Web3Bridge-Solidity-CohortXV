//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";

contract UpgradeEmergencyFacet is Script {
    function run() external {
        address diamondAddress = vm.envAddress("DIAMOND");

        vm.startBroadcast();

        EmergencyFacet emergencyFacet = new EmergencyFacet();
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = EmergencyFacet.emergencyWithdraw.selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(emergencyFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");

        vm.stopBroadcast();

        console.log("EmergencyFacet deployed to:", address(emergencyFacet));
        console.log("EmergencyFacet added to Diamond:", diamondAddress);
    }
}