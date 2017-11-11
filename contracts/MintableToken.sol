pragma solidity ^0.4.15;

import "./StandardToken.sol";


contract MintableToken is StandardToken
{
    address public mintMaster;

    event LogMintTokens(address recipient, uint amount, uint newBalance, uint totalSupply);
    event LogSetMintMaster(address oldMintMaster, address newMintMaster);

    function MintableToken(address _mintMaster) {
        mintMaster = _mintMaster;
    }

    function setMintMaster(address newMintMaster)
        returns (bool success)
    {
        require(msg.sender == mintMaster);

        address oldMintMaster = mintMaster;
        mintMaster = newMintMaster;

        LogSetMintMaster(oldMintMaster, mintMaster);
        return true;
    }

    function mintTokens(address recipient, uint amount)
        returns (bool success)
    {
        require(msg.sender == mintMaster);

        balances[recipient] = balances[recipient].safeAdd(amount);
        totalSupply = totalSupply.safeAdd(amount);

        LogMintTokens(recipient, amount, balances[recipient], totalSupply);
        return true;
    }
}
