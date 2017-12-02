pragma solidity ^0.4.15;

import "./StandardToken.sol";


contract MintableToken is StandardToken
{
    address public mintMaster;

    event LogMintTokens(address recipient, uint amount, uint newBalance, uint totalSupply);
    event LogUnmintTokens(address hodler, uint amount, uint newBalance, uint totalSupply);
    event LogSetMintMaster(address oldMintMaster, address newMintMaster);

    function MintableToken(address _mintMaster) {
        mintMaster = _mintMaster;
    }

    function setMintMaster(address newMintMaster)
        returns (bool ok)
    {
        require(msg.sender == mintMaster);

        address oldMintMaster = mintMaster;
        mintMaster = newMintMaster;

        LogSetMintMaster(oldMintMaster, mintMaster);
        return true;
    }

    function mintTokens(address recipient, uint amount)
        returns (bool ok)
    {
        require(msg.sender == mintMaster);
        require(amount > 0);

        balances[recipient] = balances[recipient].safeAdd(amount);
        totalSupply = totalSupply.safeAdd(amount);

        LogMintTokens(recipient, amount, balances[recipient], totalSupply);
        Transfer(address(0), recipient, amount);
        return true;
    }

    function unmintTokens(address hodler, uint amount)
        returns (bool ok)
    {
        require(msg.sender == mintMaster);
        require(amount > 0);
        require(balances[hodler] >= amount);

        balances[hodler] = balances[hodler].safeSub(amount);
        totalSupply = totalSupply.safeSub(amount);

        LogUnmintTokens(hodler, amount, balances[hodler], totalSupply);
        return true;
    }
}
