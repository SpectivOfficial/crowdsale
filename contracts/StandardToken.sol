pragma solidity ^0.4.15;

import "./ERC20.sol";
import "./SafeMath.sol";


/**
  * Standard ERC20 token with Short Hand Attack and approve() race condition mitigation.
  *
  * Based on code by FirstBlood:
  * https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
  */
contract StandardToken is ERC20
{
    using SafeMath for uint;

    mapping(address => uint) balances;
    mapping(address => mapping (address => uint)) allowed;

    // Interface marker
    bool public constant isToken = true;

    /**
      * Fix for the ERC20 short address attack
      *
      * http://vessenes.com/the-erc20-short-address-attack-explained/
      */
    modifier onlyPayloadSize(uint size) {
        require(msg.data.length == size + 4);
        _;
    }

    function transfer(address _to, uint _value)
        onlyPayloadSize(2 * 32)
        returns (bool success)
    {
        balances[msg.sender] = balances[msg.sender].safeSub(_value);
        balances[_to] = balances[_to].safeAdd(_value);

        Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address from, address to, uint value)
        returns (bool success)
    {
        uint _allowance = allowed[from][msg.sender];

        // Check is not needed because _allowance.safeSub(value) will throw if this condition is not met
        // if (value > _allowance) throw;

        balances[to] = balances[to].safeAdd(value);
        balances[from] = balances[from].safeSub(value);
        allowed[from][msg.sender] = _allowance.safeSub(value);

        Transfer(from, to, value);
        return true;
    }

    function balanceOf(address account)
        constant
        returns (uint balance)
    {
        return balances[account];
    }

    function approve(address spender, uint value)
        returns (bool success)
    {
        // To change the approve amount you first have to reduce the addresses`
        //  allowance to zero by calling `approve(spender, 0)` if it is not
        //  already 0 to mitigate the race condition described here:
        //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
        if ((value != 0) && (allowed[msg.sender][spender] != 0)) throw;

        allowed[msg.sender][spender] = value;

        Approval(msg.sender, spender, value);
        return true;
    }

    function allowance(address account, address spender)
        constant
        returns (uint remaining)
    {
        return allowed[account][spender];
    }
}

