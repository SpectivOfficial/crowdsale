pragma solidity ^0.4.15;

import './SigToken.sol';
import './SafeMath.sol';
import './Ownable.sol';


contract Crowdsale is Ownable
{
    using SafeMath for uint;

    SigToken public tokenContract;

    uint public startTime;
    uint public endTime;
    uint public ethMin; // this is denominated in wei
    uint public ethMax; // this is denominated in wei
    address public multisigWallet;
    uint public level1StartTime;
    uint public level2StartTime;
    uint public level3StartTime;
    uint public level4StartTime;

    uint public sigsPerETH = 650;

    bool public isHalted;
    bool public isFinalized;
    mapping(address => uint) public contributions;

    // minimum contribution amount
    uint constant dust = 1 finney;

    enum State { Unstarted, Started, Succeeded, Failed, Finalized }

    event LogDeployedToken(address token);
    event LogPurchase(address purchaser, uint eth, uint baseSigs, uint bonusSigs);
    event LogPresalePurchase(address purchaser, uint sigs);
    event LogHaltCrowdsale();
    event LogUnhaltCrowdsale();
    event LogSetSigsPerETH(uint oldRate, uint newRate);
    event LogWithdrawAfterFailure(address purchaser, uint amount);
    event LogFinalizeCrowdsale(uint finalRaise);
    event LogSetMultisigWallet(address oldWallet, address newWallet);

    function Crowdsale(uint _startTime, uint _endTime, uint _ethMin, uint _ethMax, address _multisigWallet, uint _level1StartTime, uint _level2StartTime, uint _level3StartTime, uint _level4StartTime)
        Ownable(msg.sender)
    {
        require(_startTime > block.timestamp);
        require(_level1StartTime > _startTime);
        require(_level2StartTime > _level1StartTime);
        require(_level3StartTime > _level2StartTime);
        require(_level4StartTime > _level3StartTime);
        require(_endTime > _level4StartTime);
        require(_ethMin > 0);
        require(_ethMax > _ethMin);
        require(_multisigWallet != 0x0);

        startTime = _startTime;
        endTime = _endTime;
        ethMin = _ethMin;
        ethMax = _ethMax;
        multisigWallet = _multisigWallet;
        level1StartTime = _level1StartTime;
        level2StartTime = _level2StartTime;
        level3StartTime = _level3StartTime;
        level4StartTime = _level4StartTime;

        // deploy token contract
        // tokenContract = new SigToken();
    }

    function deployToken()
        onlyOwner
        returns (bool ok)
    {
        require(address(tokenContract) == 0x0); // can only happen once

        tokenContract = new SigToken();

        LogDeployedToken(address(tokenContract));
        return true;
    }

    // This function exists because companies like Parity exist.  We want to retain the ability to
    // discard a broken multisig wallet as late in the game as possible before finalizing the crowdsale.
    function setMultisigWallet(address _multisigWallet)
        onlyOwner
        returns (bool ok)
    {
        require(_multisigWallet != 0x0);

        address oldWallet = multisigWallet;
        multisigWallet = _multisigWallet;

        LogSetMultisigWallet(oldWallet, multisigWallet);
        return true;
    }

    // We allow changing the SIG/ETH exchange rate up until the crowdsale starts in case of huge
    // swings in ETH's market price.  Once the sale starts, the price is fixed.
    function setSigsPerETH(uint _sigsPerETH)
        onlyOwner
        returns (bool ok)
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
        require(address(tokenContract) != 0x0);
        require(getState() == State.Started);
        require(isHalted == false);
        require(this.balance <= ethMax);
        require(msg.value >= dust);

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
        returns (bool ok)
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

        // people who contribute more than 20 ETH get a 20% bonus
        if (numWei >= 20 ether) {
            sigsBase = sigsBase.safeMul(120).safeDiv(100);
        }

        // Crowdsale starts with early bird participants who get a 60% bonus.  This precedes "level 1".
        if (block.timestamp < level1StartTime) {
            return (sigsBase, sigsBase.safeMul(160).safeDiv(100));
        // Level 1 participats get a 40% bonus.
        } else if (block.timestamp < level2StartTime) {
            return (sigsBase, sigsBase.safeMul(140).safeDiv(100));
        // Level 2 participats get a 25% bonus.
        } else if (block.timestamp < level3StartTime) {
            return (sigsBase, sigsBase.safeMul(125).safeDiv(100));
        // Level 3 participats get a 15% bonus.
        } else if (block.timestamp < level4StartTime) {
            return (sigsBase, sigsBase.safeMul(115).safeDiv(100));
        // Level 4 participats get what they pay for.
        } else {
            return (sigsBase, sigsBase);
        }
    }

    function withdrawAfterFailure()
        returns (bool ok)
    {
        require(getState() == State.Failed);

        uint amount = contributions[msg.sender];
        require(amount > 0);

        contributions[msg.sender] = 0;

        msg.sender.transfer(amount);

        LogWithdrawAfterFailure(msg.sender, amount);
        return true;
    }

    function unmintFailedKYCTokens(address buyer)
        onlyOwner
        returns (bool ok)
    {
        State state = getState();
        require(state == State.Started || state == State.Succeeded);
        require(contributions[buyer] > 0);

        uint contributionAmount = contributions[buyer];
        contributions[buyer] = 0;

        tokenContract.unmintTokens(buyer, tokenContract.balanceOf(buyer));

        buyer.transfer(contributionAmount);

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
        returns (bool ok)
    {
        require(getState() == State.Succeeded);
        require(multisigWallet != 0x0);

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

        uint finalRaise = this.balance;
        // move all funds to the multisig wallet
        multisigWallet.transfer(this.balance);

        LogFinalizeCrowdsale(finalRaise);
        return true;
    }

    function haltCrowdsale()
        onlyOwner
        returns (bool ok)
    {
        require(!isHalted);

        isHalted = true;
        LogHaltCrowdsale();
        return true;
    }

    function unhaltCrowdsale()
        onlyOwner
        returns (bool ok)
    {
        require(isHalted);

        isHalted = false;
        LogUnhaltCrowdsale();
        return true;
    }

    function getState()
        constant
        returns (State)
    {
        if (isFinalized) return State.Finalized;

        if (block.timestamp < startTime) {
            return State.Unstarted;
        } else if (block.timestamp <= endTime) {
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

