// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AlbumCoin.sol";
import "../src/RewardClaimer.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address backendSigner = vm.envAddress("BACKEND_SIGNER_ADDRESS");
        vm.startBroadcast(deployerKey);

        AlbumCoin token = new AlbumCoin();
        RewardClaimer claimer = new RewardClaimer(address(token), backendSigner);
        token.setMinter(address(claimer));

        vm.stopBroadcast();

        console.log("AlbumCoin:", address(token));
        console.log("RewardClaimer:", address(claimer));
    }
}
