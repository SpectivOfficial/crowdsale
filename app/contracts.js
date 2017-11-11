
import { default as contract } from 'truffle-contract'
let _tempo = require('@digix/tempo')
let tempo = {}

import sigTokenArtifacts from '../build/contracts/SigToken.json'
import crowdsaleArtifacts from '../build/contracts/Crowdsale.json'

let SigToken, Crowdsale

async function init(web3) {
    const _SigToken = contract(sigTokenArtifacts)
    const _Crowdsale = contract(crowdsaleArtifacts)

    _SigToken.setProvider(web3.currentProvider)
    _Crowdsale.setProvider(web3.currentProvider)

    Crowdsale = await _Crowdsale.deployed()
    SigToken = await _SigToken.at( await Crowdsale.tokenContract() )

    let { wait, waitUntilBlock } = _tempo(web3)
    tempo.wait = wait
    tempo.waitUntilBlock = waitUntilBlock

    window.contracts = {
        Crowdsale,
        SigToken,
    }

    // waitUntilBlock(0, 12)
}

export {
    init,
    SigToken,
    Crowdsale,
}