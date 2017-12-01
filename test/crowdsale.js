let Promise = require('bluebird')
let SigToken = artifacts.require('./SigToken.sol')
let Crowdsale = artifacts.require('./Crowdsale.sol')
let helpers = require('./helpers')
let expectThrow = helpers.expectThrow
let { wait, waitUntilBlock } = require('@digix/tempo')(web3)

if (typeof web3.eth.getAccountsPromise !== 'function') {
    Promise.promisifyAll(web3.eth, { suffix: 'Promise' })
}

contract('Crowdsale', accounts => {
    const owner = accounts[0]
    const multisig = accounts[9]

    let timestamp, startTime, level1, level2, level3, level4, endTime, ethMin, ethMax

    beforeEach(async () => {
        timestamp = (await web3.eth.getBlockPromise('latest')).timestamp
        startTime = timestamp + 1000
        level1 = startTime + 2
        level2 = level1 + 2
        level3 = level2 + 2
        level4 = level3 + 2
        endTime = level4 + 5
        ethMin = 10
        ethMax = 100
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
                assert.equal(0, await crowdsale.getState())
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

        describe(`when called by the owner for the first time`, async () => {
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

        describe(`when called by the owner with a nonzero address`, async () => {
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
})



        //     it(`blah`, async () => {
        //         let sigs = await crowdsale.numSigsToMint(web3.toWei(1, 'ether'), { from: accounts[0] })
        //         assert.equal(sigs, 400)

        //         sigs = await crowdsale.numSigsToMint(web3.toWei(30000, 'ether'), { from: accounts[0] })
        //         assert.equal(sigs, 12000000)
        //     })
