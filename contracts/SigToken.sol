pragma solidity ^0.4.15;

import "./UpgradeableToken.sol";
import "./MintableToken.sol";


contract SigToken is UpgradeableToken, MintableToken
{
    string public name = "Signals";
    string public symbol = "SIG";
    uint public decimals = 18;

    function SigToken()
        UpgradeableToken(msg.sender)
        MintableToken(msg.sender)
    {
        crowdsaleContract = msg.sender;
        totalSupply = 0; // we mint during the crowdsale, so totalSupply must start at 0
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



