pragma solidity ^0.4.15;

import "./UpgradeableToken.sol";
import "./MintableToken.sol";


contract SigToken is UpgradeableToken, MintableToken
{
    string public name = "Signals";
    string public symbol = "SIG";
    uint8 public decimals = 18;

    address public crowdsaleContract;
    bool public crowdsaleCompleted;

    function SigToken()
        UpgradeableToken(msg.sender)
        MintableToken(msg.sender)
    {
        crowdsaleContract = msg.sender;
        totalSupply = 0; // we mint during the crowdsale, so totalSupply must start at 0
    }

    function transfer(address _to, uint _value)
        returns (bool success)
    {
        require(crowdsaleCompleted);
        return StandardToken.transfer(_to, _value);
    }

    function transferFrom(address from, address to, uint value)
        returns (bool success)
    {
        require(crowdsaleCompleted);
        return StandardToken.transferFrom(from, to, value);
    }

    function approve(address spender, uint value)
        returns (bool success)
    {
        require(crowdsaleCompleted);
        return StandardToken.approve(spender, value);
    }

    // This is called to unlock tokens once the crowdsale (and subsequent audit + legal process) are
    // completed.  We don't want people buying tokens during the sale and then immediately starting
    // to trade them.  See Crowdsale::finalizeCrowdsale().
    function setCrowdsaleCompleted() {
        require(msg.sender == crowdsaleContract);
        require(crowdsaleCompleted == false);

        crowdsaleCompleted = true;
    }

    /**
     * ERC20 approveAndCall extension
     *
     * Approves and then calls the receiving contract
     */
    function approveAndCall(address _spender, uint256 _value, bytes _extraData) public returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);

        //call the receiveApproval function on the contract you want to be notified. This crafts the function signature manually so one doesn't have to include a contract in here just for this.
        //receiveApproval(address _from, uint256 _value, address _tokenContract, bytes _extraData)
        //it is assumed when one does this that the call *should* succeed, otherwise one would use vanilla approve instead.
        require(_spender.call(bytes4(bytes32(keccak256("receiveApproval(address,uint256,address,bytes)"))), msg.sender, _value, this, _extraData));
        return true;
    }
}



