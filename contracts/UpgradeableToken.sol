pragma solidity ^0.4.15;

import "./StandardToken.sol";


/**
  * Upgrade target interface inspired by Lunyr.
  *
  * Upgrade agent transfers tokens to a new contract.
  * Upgrade agent itself can be the token contract, or just a middle man contract doing the heavy lifting.
  */
contract UpgradeTarget
{
    uint public originalSupply;

    /** Interface marker */
    function isUpgradeTarget() public constant returns (bool) {
        return true;
    }

    function upgradeFrom(address _from, uint256 _value) public;
}


/**
  * A token upgrade mechanism where users can opt-in amount of tokens to the next smart contract revision.
  *
  * First envisioned by Golem and Lunyr projects.
  */
contract UpgradeableToken is StandardToken
{
    /** Contract / person who can set the upgrade path. This can be the same as team multisig wallet, as what it is with its default value. */
    address public upgradeMaster;

    /** The next contract where the tokens will be migrated. */
    UpgradeTarget public upgradeTarget;

    /** How many tokens we have upgraded by now. */
    uint256 public totalUpgraded;

    /**
      * Upgrade states.
      *
      * - NotAllowed: The child contract has not reached a condition where the upgrade can bgun
      * - WaitingForAgent: Token allows upgrade, but we don't have a new agent yet
      * - ReadyToUpgrade: The agent is set, but not a single token has been upgraded yet
      * - Upgrading: Upgrade agent is set and the balance holders can upgrade their tokens
      *
      */
    enum UpgradeState {Unknown, NotAllowed, WaitingForAgent, ReadyToUpgrade, Upgrading}

    /**
      * Somebody has upgraded some of his tokens.
      */
    event LogUpgrade(address indexed _from, address indexed _to, uint256 _value);

    /**
      * New upgrade agent available.
      */
    event LogSetUpgradeTarget(address agent);

    /**
      * Do not allow construction without upgrade master set.
      */
    function UpgradeableToken(address _upgradeMaster) {
        upgradeMaster = _upgradeMaster;
    }

    /**
      * Allow the token holder to upgrade some of their tokens to a new contract.
      */
    function upgrade(uint256 value) public {
        UpgradeState state = getUpgradeState();
        require(state == UpgradeState.ReadyToUpgrade || state == UpgradeState.Upgrading);

        // Validate input value.
        require(value > 0);

        balances[msg.sender] = balances[msg.sender].safeSub(value);

        // Take tokens out from circulation
        totalSupply   = totalSupply.safeSub(value);
        totalUpgraded = totalUpgraded.safeAdd(value);

        // Upgrade agent reissues the tokens
        upgradeTarget.upgradeFrom(msg.sender, value);
        LogUpgrade(msg.sender, upgradeTarget, value);
    }

    /**
      * Set an upgrade targget that handles the process of letting users opt-in to the new token contract.
      */
    function setUpgradeTarget(address target) external {
        require(canUpgrade());
        require(target != 0x0);
        require(msg.sender == upgradeMaster); // Only a master can designate the next target
        require(getUpgradeState() != UpgradeState.Upgrading); // Upgrade has already begun

        upgradeTarget = UpgradeTarget(target);

        require(upgradeTarget.isUpgradeTarget()); // Bad interface
        require(upgradeTarget.originalSupply() == totalSupply); // Make sure that token supplies match in source and target

        LogSetUpgradeTarget(upgradeTarget);
    }

    /**
      * Get the state of the token upgrade.
      */
    function getUpgradeState() public constant returns (UpgradeState) {
        if (!canUpgrade()) return UpgradeState.NotAllowed;
        else if (address(upgradeTarget) == 0x00) return UpgradeState.WaitingForAgent;
        else if (totalUpgraded == 0) return UpgradeState.ReadyToUpgrade;
        else return UpgradeState.Upgrading;
    }

    /**
      * Change the upgrade master.
      *
      * This allows us to set a new owner for the upgrade mechanism.
      */
    function setUpgradeMaster(address master) public {
        require(master != 0x0);
        require(msg.sender == upgradeMaster);

        upgradeMaster = master;
    }

    /**
      * Child contract can enable to provide the condition when the upgrade can begun.
      */
    function canUpgrade() public constant returns (bool) {
        return true;
    }
}


