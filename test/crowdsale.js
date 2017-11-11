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

    describe('when the constructor is called', async () => {

        it('should reject a startBlock in the past', async () => {
            const blockNumber = await web3.eth.getBlockNumberPromise()
            const startBlock = blockNumber
            const endBlock = startBlock + 60
            const ethMin = 10
            const ethMax = 100
            await expectThrow( Crowdsale.new(startBlock, endBlock, ethMin, ethMax, { from: owner }) )
        })

        it('should reject an endBlock that is less than or equal to startBlock', async () => {
            const blockNumber = await web3.eth.getBlockNumberPromise()
            const startBlock = blockNumber + 30
            const endBlock = startBlock
            const ethMin = 10
            const ethMax = 100

            await expectThrow( Crowdsale.new(startBlock, endBlock, ethMin, ethMax, { from: owner }) )
        })

        it('should reject an ethMin of 0', async () => {
            const blockNumber = await web3.eth.getBlockNumberPromise()
            const startBlock = blockNumber + 30
            const endBlock = startBlock + 30
            const ethMin = 0
            const ethMax = 100

            await expectThrow( Crowdsale.new(startBlock, endBlock, ethMin, ethMax, { from: owner }) )
        })

        it('should reject an ethMax <= ethMin', async () => {
            const blockNumber = await web3.eth.getBlockNumberPromise()
            const startBlock = blockNumber + 30
            const endBlock = startBlock + 30
            const ethMin = 10
            const ethMax = 10

            await expectThrow( Crowdsale.new(startBlock, endBlock, ethMin, ethMax, { from: owner }) )
        })

        describe('with valid parameters', async () => {
            let blockNumber, startBlock, endBlock, ethMin, ethMax
            let crowdsale, sigToken

            beforeEach(async () => {
                blockNumber = await web3.eth.getBlockNumberPromise()
                startBlock = blockNumber + 30
                endBlock = startBlock + 30
                ethMin = 10
                ethMax = 100

                crowdsale = await Crowdsale.new(startBlock, endBlock, ethMin, ethMax, { from: owner })
                sigToken = await SigToken.at( await crowdsale.tokenContract() )
            })

            it('blah', async () => {
                let sigs = await crowdsale.numSigsToMint(web3.toWei(1, 'ether'), { from: accounts[0] })
                assert.equal(sigs, 400)

                sigs = await crowdsale.numSigsToMint(web3.toWei(30000, 'ether'), { from: accounts[0] })
                assert.equal(sigs, 12000000)
            })

            it('should reflect the totalSupply from the pre-sale minting', async () => {
                const totalSupply = await sigToken.totalSupply()
                assert.equal(totalSupply, 123)
            })

            it('should reflect the startBlock, endBlock, ethMin, and ethMax provided to the constructor', async () => {
                const _startBlock = await crowdsale.startBlock()
                const _endBlock   = await crowdsale.endBlock()
                const _ethMin     = await crowdsale.ethMin()
                const _ethMax     = await crowdsale.ethMax()

                assert.equal(_startBlock, startBlock, 'startBlock')
                assert.equal(_endBlock, endBlock, 'endBlock')
                assert.equal(_ethMin, ethMin, 'ethMin')
                assert.equal(_ethMax, ethMax, 'ethMax')
            })

            it('should reflect the deploying account as the owner', async () => {
                const _owner = await crowdsale.owner()
                assert.equal(_owner, owner, 'owner')
            })
        })
    })


    // it('')
})


