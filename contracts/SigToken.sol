pragma solidity ^0.4.15;

import "./UpgradeableToken.sol";
import "./MintableToken.sol";


/**
  * Centrally issued Ethereum token.
  *
  * We mix in mintable and upgradeable traits.
  *
  * Token supply is created in the token contract creation and allocated to owner.
  * The owner can then transfer from its supply to crowdsale participants.
  * The owner, or anybody, can burn any excessive tokens they are holding.
  *
  */
contract SigToken is UpgradeableToken, MintableToken
{
    string public name = "Signals";
    string public symbol = "SIG";
    uint public decimals = 18;

    function SigToken()
        UpgradeableToken(msg.sender)
        MintableToken(msg.sender)
    {
        totalSupply = 0; // we mint during the crowdsale, so totalSupply must start at 0
    }
}



