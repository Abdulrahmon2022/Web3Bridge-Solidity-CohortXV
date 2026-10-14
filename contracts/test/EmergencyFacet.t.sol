//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {Diamond, DiamondArgs} from "lib/diamond-1-hardhat/contracts/Diamond.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondCutFacet.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";

contract EmergencyFacetTest is Test {
    address private owner;
    Diamond private diamond;

    function setUp() public {
        owner = makeAddr("diamond-owner");
        DiamondCutFacet cutFacet = new DiamondCutFacet();

        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = IDiamondCut.diamondCut.selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(cutFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        diamond = new Diamond(
            cut,
            DiamondArgs({owner: owner, init: address(0), initCalldata: ""})
        );
    }

    function testEmergencyWithdrawThroughDiamondAfterFacetAdd() public {
        EmergencyFacet emergencyFacet = new EmergencyFacet();
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = EmergencyFacet.emergencyWithdraw.selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(emergencyFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.prank(owner);
        IDiamondCut(address(diamond)).diamondCut(cut, address(0), "");

        vm.deal(address(diamond), 100 ether);
        vm.prank(owner);
        EmergencyFacet(address(diamond)).emergencyWithdraw();

        assertEq(owner.balance, 90 ether);
        assertEq(address(diamond).balance, 10 ether);
    }
}