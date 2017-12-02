let Promise = require('bluebird')
let SigToken = artifacts.require('./SigToken.sol')
let Crowdsale = artifacts.require('./Crowdsale.sol')
let { expectThrow, waitUntilTime } = require('./helpers')
let { wait, waitUntilBlock } = require('@digix/tempo')(web3)

if (typeof web3.eth.getAccountsPromise !== 'function') {
    Promise.promisifyAll(web3.eth, { suffix: 'Promise' })
}

const State = {
    Unstarted: 0,
    Started: 1,
    Succeeded: 2,
    Failed: 3,
    Finalized: 4,
}

contract('Crowdsale', accounts => {
    const owner = accounts[0]
    const multisig = accounts[9]

    let timestamp, startTime, level1, level2, level3, level4, endTime, ethMin, ethMax

    beforeEach(async () => {
        timestamp = (await web3.eth.getBlockPromise('latest')).timestamp
        startTime = timestamp + 200
        level1 = startTime + 200
        level2 = level1 + 200
        level3 = level2 + 200
        level4 = level3 + 200
        endTime = level4 + 200
        ethMin = web3.toWei(10, 'finney')
        ethMax = web3.toWei(100, 'finney')
    })

    describe(`constructor()`, () => {
        it(`should reject a startTime in the past`, async () => {
            startTime = timestamp - 1
            await expectThrow( Crowdsale.new(startTime, endTime, ethMin, ethMax, multisig, level1, level2, level3, level4, { from: owner }) )
        })

        it(`should reject an endTime that is less than or equal to level4StartTime`, async () => {
            endTime = level4
            await expectThrow( Crowdsale.new(startTime, endTime, ethMin, ethMax, multisig, level1, level2, level3, level4, { from: owner }) )
        })

        it(`should reject an ethMin of 0`, async () => {
            ethMin = 0
            await expectThrow( Crowdsale.new(startTime, endTime, ethMin, ethMax, multisig, level1, level2, level3, level4, { from: owner }) )
        })

        it(`should reject an ethMax <= ethMin`, async () => {
            ethMax = ethMin
            await expectThrow( Crowdsale.new(startTime, endTime, ethMin, ethMax, multisig, level1, level2, level3, level4, { from: owner }) )
        })

        it(`should reject an empty multisigWallet param`, async () => {
            await expectThrow( Crowdsale.new(startTime, endTime, ethMin, ethMax, '0x00', level1, level2, level3, level4, { from: owner }) )
        })

        describe(`with valid parameters`, () => {
            let crowdsale
            beforeEach(async () => {
                crowdsale = await Crowdsale.new(startTime, endTime, ethMin, ethMax, multisig, level1, level2, level3, level4, { from: owner })
            })

            it(`should set state variables correctly`, async () => {
                assert.equal(startTime, await crowdsale.startTime())
                assert.equal(endTime, await crowdsale.endTime())
                assert.equal(level1, await crowdsale.level1StartTime())
                assert.equal(level2, await crowdsale.level2StartTime())
                assert.equal(level3, await crowdsale.level3StartTime())
                assert.equal(level4, await crowdsale.level4StartTime())
                assert.equal(ethMin, await crowdsale.ethMin())
                assert.equal(ethMax, await crowdsale.ethMax())
                assert.equal(multisig, await crowdsale.multisigWallet())
                assert.equal(0, await crowdsale.tokenContract())
                assert.equal(false, await crowdsale.isHalted())
                assert.equal(false, await crowdsale.isFinalized())
                assert.equal(State.Unstarted, await crowdsale.getState())
            })

            it(`should reflect the deploying account as the owner`, async () => {
                assert.equal(await crowdsale.owner(), owner)
            })
        })
    })

    describe(`deployToken()`, () => {
        let crowdsale
        beforeEach(async () => {
            crowdsale = await Crowdsale.new(startTime, endTime, ethMin, ethMax, multisig, level1, level2, level3, level4, { from: owner })
        })

        it(`should throw unless called by the owner`, async () => {
            await expectThrow( crowdsale.deployToken({ from: accounts[1] }) )
        })

        it(`should throw if called twice`, async () => {
            await crowdsale.deployToken({ from: owner })
            await expectThrow( crowdsale.deployToken({ from: owner }) )
        })

        describe(`when called by the owner for the first time`, () => {
            it(`should deploy the contract and set the tokenContract state variable`, async () => {
                let tx = await crowdsale.deployToken({ from: owner })
                assert(tx.logs.length > 0)
                assert.equal(tx.logs[0].event, 'LogDeployedToken')

                let addr = tx.logs[0].args.token
                assert.notEqual(addr, 0)
                assert.equal(addr, await crowdsale.tokenContract())
            })
        })
    })

    describe(`setMultisigWallet()`, () => {
        let crowdsale
        beforeEach(async () => {
            crowdsale = await Crowdsale.new(startTime, endTime, ethMin, ethMax, multisig, level1, level2, level3, level4, { from: owner })
        })

        it(`should throw unless called by the owner`, async () => {
            await expectThrow( crowdsale.setMultisigWallet('0xdeadbeef', { from: accounts[1] }) )
        })

        it(`should throw if called with 0x00`, async () => {
            await expectThrow( crowdsale.setMultisigWallet('0x00', { from: owner }) )
        })

        describe(`when called by the owner with a nonzero address`, () => {
            it(`should set the multisigWallet state variable`, async () => {
                let newWallet = accounts[3]
                let tx = await crowdsale.setMultisigWallet(newWallet, { from: owner })
                assert(tx.logs.length > 0)
                assert.equal(tx.logs[0].event, 'LogSetMultisigWallet')
                assert.equal(tx.logs[0].args.oldWallet, multisig, 'logs[0].args.oldWallet')
                assert.equal(tx.logs[0].args.newWallet, newWallet, 'logs[0].args.newWallet')

                assert.equal(newWallet, await crowdsale.multisigWallet(), 'crowdsale.multisigWallet')
            })
        })
    })

    describe(`setSigsPerETH()`, () => {
        let crowdsale
        beforeEach(async () => {
            crowdsale = await Crowdsale.new(startTime, endTime, ethMin, ethMax, multisig, level1, level2, level3, level4, { from: owner })
        })

        it(`should throw if the crowdsale is not in the Unstarted state`, async () => {
            let state = await crowdsale.getState()
            assert.equal(state, State.Unstarted)

            await waitUntilTime(startTime + 10, 1)
            state = await crowdsale.getState()
            assert.equal(state, State.Started)

            await expectThrow( crowdsale.setSigsPerETH(100, { from: owner }) )
        })

        it(`should throw if called by someone other than the owner`, async () => {
            await expectThrow( crowdsale.setSigsPerETH(100, { from: accounts[1] }) )
        })

        it(`should throw if called with a 0 argument`, async () => {
            await expectThrow( crowdsale.setSigsPerETH(0, { from: owner }) )
        })

        describe(`when called by the owner with a nonzero argument before the crowdsale has started`, () => {
            it(`should set the sigsPerETH state variable`, async () => {
                await crowdsale.setSigsPerETH(100, { from: owner })
                assert.equal(100, await crowdsale.sigsPerETH())
            })
        })
    })

    describe(`mintPresaleTokens()`, () => {
        const buyer1 = accounts[2]
        const buyer2 = accounts[3]
        const buyer1Amount = 100
        const buyer2Amount = 101
        let crowdsale, token

        beforeEach(async () => {
            crowdsale = await Crowdsale.new(startTime, endTime, ethMin, ethMax, multisig, level1, level2, level3, level4, { from: owner })
            await crowdsale.deployToken({ from: owner })
            token = await SigToken.at(await crowdsale.tokenContract())
        })

        it(`should throw if the crowdsale is Failed`, async () => {
            await waitUntilTime(endTime + 1)
            let state = await crowdsale.getState()
            assert.equal(state, State.Failed, `crowdsale is not in Failed state`)

            await expectThrow( crowdsale.mintPresaleTokens(buyer1, buyer1Amount, { from: owner }) )
        })

        it(`should throw if the crowdsale is Finalized`, async () => {
            await waitUntilTime(startTime + 1)
            let state = await crowdsale.getState()
            assert.equal(state, State.Started, `crowdsale is not in Started state`)

            await crowdsale.sendTransaction({ from: accounts[5], value: web3.toWei(11, 'finney') })

            await waitUntilTime(endTime + 1)
            state = await crowdsale.getState()
            assert.equal(state, State.Succeeded, `crowdsale is not in Succeeded state`)

            await crowdsale.finalizeCrowdsale({ from: owner })
            state = await crowdsale.getState()
            assert.equal(state, State.Finalized, `crowdsale is not in Finalized state`)

            await expectThrow( crowdsale.mintPresaleTokens(buyer1, buyer1Amount, { from: owner }) )
        })

        it(`should throw if called by someone other than the owner`, async () => {
            await expectThrow( crowdsale.mintPresaleTokens(buyer1, buyer1Amount, { from: accounts[4] }) )
        })

        describe(`when called by the owner and the crowdsale is not Failed or Finalized`, () => {
            let prevTotalSupply, prevBuyer1Balance, prevBuyer2Balance
            const buyer1Amount2 = 42

            beforeEach(async () => {
                prevTotalSupply = await token.totalSupply()
                prevBuyer1Balance = await token.balanceOf(buyer1)
                prevBuyer2Balance = await token.balanceOf(buyer2)
                await crowdsale.mintPresaleTokens(buyer1, buyer1Amount, { from: owner })
                await crowdsale.mintPresaleTokens(buyer2, buyer2Amount, { from: owner })
                await crowdsale.mintPresaleTokens(buyer1, buyer1Amount2, { from: owner })
            })

            it(`should add to tokenContract.totalSupply`, async () => {
                assert.equal(prevTotalSupply.toNumber() + buyer1Amount + buyer2Amount + buyer1Amount2, await token.totalSupply())
            })

            it(`should add to tokenContract.balanceOf(buyer)`, async () => {
                assert.equal(prevBuyer1Balance.toNumber() + buyer1Amount + buyer1Amount2, await token.balanceOf(buyer1))
                assert.equal(prevBuyer2Balance.toNumber() + buyer2Amount, await token.balanceOf(buyer2))
            })
        })
    })

    describe(`numSigsToMint()`, () => {
        let crowdsale, sigsPerETH

        beforeEach(async () => {
            crowdsale = await Crowdsale.new(startTime, endTime, ethMin, ethMax, multisig, level1, level2, level3, level4, { from: owner })
            sigsPerETH = (await crowdsale.sigsPerETH()).toNumber()
        })

        it(`should give a 60% bonus between startTime and level1StartTime`, async () => {
            await waitUntilTime(startTime + 1)
            let [ _, total ] = await crowdsale.numSigsToMint(web3.toWei(1, 'ether'))
            assert.approximately(sigsPerETH * 1e18 * 1.6, total.toNumber(), 0.0001)
        })

        it(`should give a 40% bonus between level1StartTime and level2StartTime`, async () => {
            await waitUntilTime(level1 + 1)
            let [ _, total ] = await crowdsale.numSigsToMint(web3.toWei(1, 'ether'))
            assert.approximately(sigsPerETH * 1e18 * 1.4, total.toNumber(), 0.0001)
        })

        it(`should give a 25% bonus between level2StartTime and level3StartTime`, async () => {
            await waitUntilTime(level2 + 1)
            let [ _, total ] = await crowdsale.numSigsToMint(web3.toWei(1, 'ether'))
            assert.approximately(sigsPerETH * 1e18 * 1.25, total.toNumber(), 0.0001)
        })

        it(`should give a 15% bonus between level3StartTime and level4StartTime`, async () => {
            await waitUntilTime(level3 + 1)
            let [ _, total ] = await crowdsale.numSigsToMint(web3.toWei(1, 'ether'))
            assert.approximately(sigsPerETH * 1e18 * 1.15, total.toNumber(), 0.0001)
        })

        it(`should return sigsPerETH * eth after level4StartTime`, async () => {
            await waitUntilTime(level4 + 1)
            let [ _, total ] = await crowdsale.numSigsToMint(web3.toWei(1, 'ether'))
            assert.equal(sigsPerETH * 1e18, total)
        })
    })
})




        //     it(`blah`, async () => {
        //         let sigs = await crowdsale.numSigsToMint(web3.toWei(1, 'ether'), { from: accounts[0] })
        //         assert.equal(sigs, 400)

        //         sigs = await crowdsale.numSigsToMint(web3.toWei(30000, 'ether'), { from: accounts[0] })
        //         assert.equal(sigs, 12000000)
        //     })
