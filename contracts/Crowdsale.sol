pragma solidity ^0.4.15;

import './SigToken.sol';
import './SafeMath.sol';
import './Ownable.sol';


contract Crowdsale is Ownable
{
    using SafeMath for uint;

    SigToken public tokenContract;

    uint public startBlock;
    uint public endBlock;
    uint public ethMin; // this is denominated in wei
    uint public ethMax; // this is denominated in wei
    address public multisigWallet;
    uint public level1StartBlock;
    uint public level2StartBlock;
    uint public level3StartBlock;
    uint public level4StartBlock;

    uint public sigsPerETH = 650;

    bool public isHalted;
    bool public isFinalized;
    mapping(address => uint) public contributions;

    // minimum contribution amount
    uint constant dust = 1 finney;

    enum State { Unstarted, Started, Succeeded, Failed, Finalized }

    event LogPurchase(address purchaser, uint eth, uint baseSigs, uint bonusSigs);
    event LogPresalePurchase(address purchaser, uint sigs);
    event LogHaltCrowdsale();
    event LogUnhaltCrowdsale();
    event LogSetSigsPerETH(uint oldRate, uint newRate);
    event LogWithdrawAfterFailure(address purchaser, uint amount);
    event LogFinalizeCrowdsale(uint finalRaise);
    event LogSetMultisigWallet(address oldWallet, address newWallet);

    function Crowdsale(uint _startBlock, uint _endBlock, uint _ethMin, uint _ethMax, address _multisigWallet, uint _level1StartBlock, uint _level2StartBlock, uint _level3StartBlock, uint _level4StartBlock)
        Ownable(msg.sender)
    {
        require(_startBlock > block.number);
        require(_level1StartBlock > _startBlock);
        require(_level2StartBlock > _level1StartBlock);
        require(_level3StartBlock > _level2StartBlock);
        require(_level4StartBlock > _level3StartBlock);
        require(_endBlock > _level4StartBlock);
        require(_ethMin > 0);
        require(_ethMax > _ethMin);
        require(_multisigWallet != 0x0);

        startBlock = _startBlock;
        endBlock = _endBlock;
        ethMin = _ethMin;
        ethMax = _ethMax;
        multisigWallet = _multisigWallet;
        level1StartBlock = _level1StartBlock;
        level2StartBlock = _level2StartBlock;
        level3StartBlock = _level3StartBlock;
        level4StartBlock = _level4StartBlock;

        // deploy token contract
        tokenContract = new SigToken();
    }

    // This function exists because companies like Parity exist.  We want to retain the ability to
    // discard a broken multisig wallet as late in the game as possible before finalizing the crowdsale.
    function setMultisigWallet(address _multisigWallet)
        onlyOwner
        returns (bool)
    {
        address oldWallet = multisigWallet;
        multisigWallet = _multisigWallet;

        LogSetMultisigWallet(oldWallet, multisigWallet);
        return true;
    }

    // We allow changing the SIG/ETH exchange rate up until the crowdsale starts in case of huge
    // swings in ETH's market price.  Once the sale starts, the price is fixed.
    function setSigsPerETH(uint _sigsPerETH)
        onlyOwner
        returns (bool)
    {
        require(getState() == State.Unstarted);

        uint old = sigsPerETH;
        sigsPerETH = _sigsPerETH;

        LogSetSigsPerETH(old, sigsPerETH);
        return true;
    }

    // This is used by the frontend when we're running in a dev environment with TestRPC in deterministic mining mode
    // function wasteTime() {}

    // Buy tokens with the fallback function.
    function()
        payable
    {
        require(getState() == State.Started);
        require(isHalted == false);
        require(this.balance <= ethMax);
        require(msg.value > dust);

        contributions[msg.sender] = contributions[msg.sender].safeAdd(msg.value);

        uint baseSigs;
        uint totalSigs;
        (baseSigs, totalSigs) = numSigsToMint(msg.value);

        bool ok = tokenContract.mintTokens(msg.sender, totalSigs);
        assert(ok);

        LogPurchase(msg.sender, msg.value, baseSigs, totalSigs.safeSub(baseSigs));
    }

    // We allow presale buyers to be added by the Spectiv team up until the crowdsale is finished.
    function mintPresaleTokens(address buyer, uint numSigs)
        onlyOwner
        returns (bool)
    {
        State state = getState();
        require(state == State.Unstarted || state == State.Started || state == State.Succeeded);

        bool ok = tokenContract.mintTokens(buyer, numSigs);
        assert(ok);

        LogPresalePurchase(buyer, numSigs);
        return true;
    }


    function numSigsToMint(uint numWei)
        constant
        returns (uint base, uint total)
    {
        uint sigsBase = sigsPerETH.safeMul(numWei).safeDiv(10 ** 18);

        // Crowdsale starts with early bird participants who get a 60% bonus.  This precedes "level 1".
        if (block.number < level1StartBlock) {
            return (sigsBase, sigsBase.safeMul(160).safeDiv(100));
        // Level 1 participats get a 40% bonus.
        } else if (block.number < level2StartBlock) {
            return (sigsBase, sigsBase.safeMul(140).safeDiv(100));
        // Level 2 participats get a 25% bonus.
        } else if (block.number < level3StartBlock) {
            return (sigsBase, sigsBase.safeMul(125).safeDiv(100));
        // Level 3 participats get a 15% bonus.
        } else if (block.number < level4StartBlock) {
            return (sigsBase, sigsBase.safeMul(115).safeDiv(100));
        // Level 4 participats get what they pay for.
        } else {
            return (sigsBase, sigsBase);
        }
    }

    function withdrawAfterFailure()
        returns (bool)
    {
        require(getState() == State.Failed);

        uint amount = contributions[msg.sender];
        require(amount > 0);

        contributions[msg.sender] = 0;

        msg.sender.transfer(amount);

        LogWithdrawAfterFailure(msg.sender, amount);
        return true;
    }

    // This should only be called 1) upon successful completion of the crowdsale, and 2) once the legal
    // audit has been completed.  This function:
    // - mints the final 40% of tokens
    // - prevents future minting
    // - allows `owner` to initiate an upgrade to a new token contract
    // - permits users to transfer tokens, and...
    // - transfers the ETH balance from this contract to the multisig wallet.
    function finalizeCrowdsale()
        onlyOwner
        returns (bool)
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

        // allow tokens to be traded
        tokenContract.setTokensaleCompleted();

        // move all funds to the multisig wallet
        multisigWallet.transfer(this.balance);

        LogFinalizeCrowdsale(this.balance);
        return true;
    }

    function haltCrowdsale()
        onlyOwner
        returns (bool)
    {
        isHalted = true;
        LogHaltCrowdsale();
        return true;
    }

    function unhaltCrowdsale()
        onlyOwner
        returns (bool)
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

