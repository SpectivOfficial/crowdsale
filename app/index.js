const Promise = require('bluebird')
const Web3 = require('web3')
const React = require('react')
const ReactDOM = require('react-dom')

import * as contracts from './contracts'
import Store from './Store'
import App from './components/App'
import { nullish } from './utils'


window.addEventListener('load', async () => {
    let web3Provider

    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof web3 !== 'undefined') {
        console.log('found existing web3')
        // Use Mist/MetaMask's provider
        window.web3 = new Web3(web3.currentProvider)

        web3Provider = !nullish(window.mist) ? 'mist' : 'metamask'
    } else {
        // fallback: infura
        window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))  //'https://mainnet.infura.io/Ii8FahOWWAtsvaOK2v5o'))
        web3Provider = 'infura'
    }

    if (typeof window.web3.eth.getAccountsPromise !== 'function') {
        Promise.promisifyAll(window.web3.eth, { suffix: 'Promise' })
    }

    // initialize our contracts and give them a web3 instance
    await contracts.init(window.web3)

    // set up our store (make it available on `window` for debug purposes)
    const store = window.store = new Store(window.web3, web3Provider, contracts)

    // find the root element where React will render
    const root = document.getElementById('app-root')
    if (root === null || root === undefined) {
        throw new Error('#app-root not found')
    }

    // listen for state changes and re-render when we get one
    store.on('new state', state => {
        ReactDOM.render(
            <App appState={state} />
        , root)
    })


    //
    // initialize our app data
    //

    await store.getAccounts()
    await store.setCurrentAccount(store.state.accounts[0])
    await Promise.all(
        store.state.accounts.map(account => store.getSIGBalance(account))
    )
    await store.getCrowdsaleParameters()

    store.getCrowdsaleState()
    store.getCurrentBlock()
    store.getTokenState()

    //
    // event listeners and auto-refreshed data
    //

    setInterval(() => {
        store.getCurrentBlock()
        store.getCrowdsaleState()
        store.getTokenState()
    }, 1000)

    contracts.Crowdsale.LogPurchase(null, { fromBlock: 1, toBlock: 'latest' }).watch((err, log) => {
        store.addLog(log)
    })

    contracts.SigToken.LogMintTokens(null, { fromBlock: 1, toBlock: 'latest' }).watch((err, log) => {
        store.addLog(log)
    })
})




