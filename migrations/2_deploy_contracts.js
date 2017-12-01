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

    let crowdsale

    deployer.then(() => {
        return web3.eth.getBlockPromise('latest')
    }).then(block => {
        const startBlock = block.timestamp + 20
        const level1 = startBlock + 20
        const level2 = level1 + 20
        const level3 = level2 + 20
        const level4 = level3 + 20
        const endBlock = level4 + 20
        const ethMin = web3.toWei(10, 'ether')
        const ethMax = web3.toWei(20, 'ether')
        const multisigWallet = '0x124193ae039d3a85fbaf40eb5bd32047ae7fa000'
        console.log(' --> startBlock:', startBlock)
        console.log(' --> endBlock:', endBlock)
        console.log(' --> ethMin:', ethMin)
        console.log(' --> ethMax:', ethMax)

        return deployer.deploy(Crowdsale, startBlock, endBlock, ethMin, ethMax, multisigWallet, level1, level2, level3, level4, { gas: 6000000, from: accounts[0] })
    }).then(() => {
        return Crowdsale.deployed()
    }).then(_crowdsale => {
        crowdsale = _crowdsale
        return crowdsale.deployToken()
    }).then(() => {
        return crowdsale.tokenContract()
    }).then(addr => {
        console.log('token contract ~>', addr)
    })

    // await (await Crowdsale.at( Crowdsale.address )).setToken(SigToken.address)

    // await (await SigToken.at( SigToken.address )).setMintMaster( Crowdsale.address )
}
