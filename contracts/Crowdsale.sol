pragma solidity ^0.4.15;

import './SigToken.sol';
import './SafeMath.sol';
import './Ownable.sol';
// import './oraclizeAPI.sol';


contract Crowdsale is Ownable
{
    using SafeMath for uint;

    SigToken public tokenContract;

    uint public startBlock;
    uint public endBlock;
    uint public ethMin;
    uint public ethMax;
    address public multisigWallet;

    uint public ethUSD;

    bool public isHalted;
    bool public isFinalized;
    mapping(address => uint) public contributions;

    enum State { Unstarted, Started, Succeeded, Failed, Finalized }

    event LogPurchase(address purchaser, uint eth, uint sigs);
    event LogHaltCrowdsale();
    event LogUnhaltCrowdsale();
    event LogWithdrawAfterFailure(address purchaser, uint amount);
    event LogFinalizeCrowdsale(uint finalRaise);

    function Crowdsale(uint _startBlock, uint _endBlock, uint _ethMin, uint _ethMax, address _multisigWallet)
        Ownable(msg.sender)
    {
        require(_startBlock > block.number);
        require(_endBlock > _startBlock);
        require(_ethMin > 0);
        require(_ethMax > _ethMin);
        require(_multisigWallet != 0);

        startBlock = _startBlock;
        endBlock = _endBlock;
        ethMin = _ethMin;
        ethMax = _ethMax;
        multisigWallet = _multisigWallet;

        // deploy token contract
        tokenContract = new SigToken();

        // mint pre-sale tokens
        tokenContract.mintTokens(0xdeadbeef, 123);
    }

    function wasteTime() {}

    function buyTokens()
        payable
        returns (bool success)
    {
        require(getState() == State.Started);
        require(isHalted == false);
        require(this.balance <= ethMax);
        require(msg.value > 0);

        contributions[msg.sender] += msg.value;

        uint numSigs = numSigsToMint(msg.value);

        bool ok = tokenContract.mintTokens(msg.sender, numSigs);
        assert(ok);

        LogPurchase(msg.sender, msg.value, numSigs);
        return true;
    }

    uint constant SIGS_PER_ETH = 400;
    uint constant LEVEL_1_BONUS_THRESHOLD = 10000 ether;
    uint constant LEVEL_2_BONUS_THRESHOLD = 50000 ether;
    uint constant LEVEL_3_BONUS_THRESHOLD = 125000 ether;

    // function updatePrice() {
    //     require(oraclize_getPrice("URL") < msg.value);

    //     oraclize_query("URL", "json(https://api.kraken.com/0/public/Ticker?pair=ETHUSD).result.XETHZUSD.c.0");
    // }

    function numSigsToMint(uint numWei)
        constant
        returns (uint)
    {
        uint sigsBase = SIGS_PER_ETH.safeMul(numWei).safeDiv(10 ** 18);

        if (this.balance <= LEVEL_1_BONUS_THRESHOLD) {
            return sigsBase.safeMul(140).safeDiv(100);
        } else if (this.balance <= LEVEL_2_BONUS_THRESHOLD) {
            return sigsBase.safeMul(125).safeDiv(100);
        } else if (this.balance <= LEVEL_3_BONUS_THRESHOLD) {
            return sigsBase.safeMul(115).safeDiv(100);
        } else {
            return sigsBase;
        }
    }

    function withdrawAfterFailure()
        returns (bool success)
    {
        require(getState() == State.Failed);

        uint amount = contributions[msg.sender];
        require(amount > 0);

        contributions[msg.sender] = 0;

        msg.sender.transfer(amount);

        LogWithdrawAfterFailure(msg.sender, amount);
        return true;
    }

    function finalizeCrowdsale()
        onlyOwner
        returns (bool success)
    {
        require(getState() == State.Succeeded);

        // don't allow finalizing more than once
        isFinalized = true;

        uint totalSupply = tokenContract.totalSupply();

        // mint the other 40% of the supply, which go to the platform reserve, management team, advisors, and bounty participants
        tokenContract.mintTokens(multisigWallet, totalSupply.safeMul(2).safeDiv(3));

        // nobody can ever mint tokens again
        tokenContract.setMintMaster(0x0);

        // upgrading to a new token contract is controlled by owner
        tokenContract.setUpgradeMaster(owner);

        // move all funds to the multisig wallet
        multisigWallet.transfer(this.balance);

        LogFinalizeCrowdsale(this.balance);
        return true;
    }

    function haltCrowdsale()
        onlyOwner
        returns (bool success)
    {
        isHalted = true;
        LogHaltCrowdsale();
        return true;
    }

    function unhaltCrowdsale()
        onlyOwner
        returns (bool success)
    {
        isHalted = false;
        LogUnhaltCrowdsale();
        return true;
    }

    function getState()
        constant
        returns (State)
    {
        if (isFinalized) return State.Finalized;

        if (block.number < startBlock) {
            return State.Unstarted;
        } else if (block.number <= endBlock) {
            if (this.balance < ethMax) {
                return State.Started;
            } else {
                return State.Succeeded;
            }
        } else {
            if (this.balance < ethMin) {
                return State.Failed;
            } else {
                return State.Succeeded;
            }
        }
    }
}

