let Promise = require('bluebird')
let SigToken = artifacts.require('./SigToken.sol')
let helpers = require('./helpers')
let expectThrow = helpers.expectThrow
let { wait, waitUntilBlock } = require('@digix/tempo')(web3)

if (typeof web3.eth.getAccountsPromise !== 'function') {
    Promise.promisifyAll(web3.eth, { suffix: 'Promise' })
}

contract('SigToken', accounts => {
    // let sigToken
    // beforeEach(async () => {
    //     sigToken = await SigToken.new({ from: accounts[0] })
    // })

    it('should reflect the startingSupply in its totalSupply before any new tokens have been minted', async () => {
        // const totalSupply = await sigToken.totalSupply({ from: accounts[0] })
        // assert.equal(totalSupply, STARTING_SUPPLY)
    })
})


