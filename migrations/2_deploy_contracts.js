let Promise = require('bluebird')
let SigToken = artifacts.require('./SigToken.sol')
let SafeMath = artifacts.require('./SafeMath.sol')
let Crowdsale = artifacts.require('./Crowdsale.sol')

if (typeof web3.eth.getAccountsPromise !== 'function') {
    Promise.promisifyAll(web3.eth, { suffix: 'Promise' })
}


module.exports = (deployer, network, accounts) => {
    deployer.deploy(SafeMath)
    deployer.link(SafeMath, [SigToken, Crowdsale])

    deployer.then(() => {
        return web3.eth.getBlockNumberPromise()
    }).then(blockNumber => {
        const startBlock = blockNumber + 8
        const endBlock = startBlock + 100
        const ethMin = web3.toWei(10, 'ether')
        const ethMax = web3.toWei(20, 'ether')
        const multisigWallet = '0x124193ae039d3a85fbaf40eb5bd32047ae7fa000'
        console.log(' --> startBlock:', startBlock)
        console.log(' --> endBlock:', endBlock)
        console.log(' --> ethMin:', ethMin)
        console.log(' --> ethMax:', ethMax)

        return deployer.deploy(Crowdsale, startBlock, endBlock, ethMin, ethMax, multisigWallet, { gas: 3000000, from: accounts[0] })
    })

    // await (await Crowdsale.at( Crowdsale.address )).setToken(SigToken.address)

    // await (await SigToken.at( SigToken.address )).setMintMaster( Crowdsale.address )
}
