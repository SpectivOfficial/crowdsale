pragma solidity ^0.4.15;

contract Ownable {
    address public owner;

    event LogSetOwner(address oldOwner, address newOwner);

    function Ownable(address _owner) {
        owner = _owner;
    }

    function setOwner(address newOwner)
        onlyOwner
        returns (bool success)
    {
        address oldOwner = owner;
        owner = newOwner;

        LogSetOwner(oldOwner, newOwner);
        return true;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }
}
