// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./AlbumCoin.sol";

contract RewardClaimer is EIP712 {
    using ECDSA for bytes32;

    AlbumCoin public immutable token;
    address public backendSigner;
    address public owner;

    mapping(bytes32 => bool) public coinClaimed;
    mapping(address => uint256) public lastClaimTime;

    bytes32 private constant CLAIM_TYPEHASH = keccak256(
        "Claim(address wallet,bytes32 coinId)"
    );
    uint256 private constant COOLDOWN = 24 hours;

    constructor(address _token, address _signer) EIP712("RewardClaimer", "1") {
        token = AlbumCoin(_token);
        backendSigner = _signer;
        owner = msg.sender;
    }

    function claimReward(bytes32 coinId, bytes memory signature) external {
        require(!coinClaimed[coinId], "Moneda ya reclamada");
        require(
            block.timestamp - lastClaimTime[msg.sender] >= COOLDOWN,
            "Cooldown activo"
        );

        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, msg.sender, coinId)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == backendSigner, "Firma invalida");

        coinClaimed[coinId] = true;
        lastClaimTime[msg.sender] = block.timestamp;
        token.mint(msg.sender, 1 ether);
    }

    function setBackendSigner(address _signer) external {
        require(msg.sender == owner, "Solo owner");
        backendSigner = _signer;
    }
}
