import EventEmitter from 'events'
import * as _ from 'lodash'


class Store extends EventEmitter
{
    constructor(web3, web3Provider, contracts) {
        super()

        // bind functions
        this.emitState = this.emitState.bind(this)

        // store constructor args
        this.web3 = web3
        this.contracts = contracts

        // define initial state
        this.state = {
            web3Provider: web3Provider,
            currentAccount: null,
            currentBlock: 0,
            accounts: [],
            sigBalances: {},
            crowdsaleParameters: {
                startBlock: 0,
                endBlock: 0,
                ethMin: 0,
                ethMax: 0,
                tokenContractAddress: null,
                crowdsaleContractAddress: null,
            },
            crowdsaleState: {
                crowdsaleBalance: 0,
                state: 0,
                isHalted: false,
            },
            tokenState: {
                totalSupply: 0,
            },
            logs: [],
        }

        // emit initial state
        this.emitState()
    }

    emitState() {
        this.emit('new state', this.state)
    }

    async addLog(log) {
        this.state.logs.push(log)
        this.emitState()
    }

    async getCurrentBlock() {
        const blockNumber = await this.web3.eth.getBlockNumberPromise()

        this.state.currentBlock = blockNumber
        this.emitState()
    }

    async getCrowdsaleState() {
        const crowdsaleBalance = await web3.eth.getBalancePromise(this.contracts.Crowdsale.address)
        const state = (await this.contracts.Crowdsale.getState()).toNumber()
        const isHalted = await this.contracts.Crowdsale.isFinalized()

        this.state.crowdsaleState = {
            crowdsaleBalance,
            state,
            isHalted,
        }

        this.emitState()
    }

    async getTokenState() {
        const totalSupply = await this.contracts.SigToken.totalSupply()

        this.state.tokenState = {
            totalSupply,
        }

        this.emitState()
    }

    async getCrowdsaleParameters() {
        const Crowdsale = this.contracts.Crowdsale
        const startBlock = await Crowdsale.startBlock()
        const endBlock = await Crowdsale.endBlock()
        const ethMin = await Crowdsale.ethMin()
        const ethMax = await Crowdsale.ethMax()
        const tokenContractAddress = await Crowdsale.tokenContract()
        const crowdsaleContractAddress = Crowdsale.address

        this.state.crowdsaleParameters = {
            startBlock, endBlock, ethMin, ethMax, tokenContractAddress, crowdsaleContractAddress
        }

        this.emitState()
    }

    async setCurrentAccount(account) {
        this.state.currentAccount = account
        this.emitState()
    }

    async getAccounts() {
        const accounts = await this.web3.eth.getAccountsPromise()
        this.state.accounts = accounts
        this.emitState()
    }

    async getSIGBalance(account) {
        const sigToken = this.contracts.SigToken
        const balance = await sigToken.balanceOf(account)

        this.state.sigBalances[account] = balance
        this.emitState()
    }
}

export default Store