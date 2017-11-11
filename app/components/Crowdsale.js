
import * as React from 'react'
import moment from 'moment'

import { nullish } from '../utils'
import * as contracts from '../contracts'
import CrowdsaleBlockProgress from './CrowdsaleBlockProgress'
import CrowdsaleRaiseProgress from './CrowdsaleRaiseProgress'
import LogsView from './LogsView'

require('./Crowdsale.css')


class Crowdsale extends React.Component
{
    state = {
        error: null,
    }

    _inputAmountETH = null

    constructor(props) {
        super(props)
        this.render = this.render.bind(this)
        this.buyTokens = this.buyTokens.bind(this)
        this.wasteTime = this.wasteTime.bind(this)
    }

    render() {
        const startBlock = this.props.crowdsaleParameters.startBlock.toString()
        const endBlock   = this.props.crowdsaleParameters.endBlock.toString()
        const currentBlock = this.props.currentBlock

        const ethMin     = web3.fromWei(this.props.crowdsaleParameters.ethMin, 'ether').toString()
        const ethMax     = web3.fromWei(this.props.crowdsaleParameters.ethMax, 'ether').toString()
        const tokenContractAddress = this.props.crowdsaleParameters.tokenContractAddress
        const crowdsaleContractAddress = this.props.crowdsaleParameters.crowdsaleContractAddress

        const crowdsaleBalance = web3.fromWei(this.props.crowdsaleState.crowdsaleBalance, 'ether').toString()
        const totalSupply = this.props.tokenState.totalSupply.toString()

        const timeRemaining = moment().add(15 * (endBlock - currentBlock), 'seconds').fromNow(true)

        return (
            <div className="crowdsale">
                <div className="sections">
                    <div className="block progress-raise-meter">
                        <CrowdsaleRaiseProgress
                            crowdsaleBalance={this.props.crowdsaleState.crowdsaleBalance}
                            ethMin={this.props.crowdsaleParameters.ethMin}
                            ethMax={this.props.crowdsaleParameters.ethMax}
                        />
                    </div>

                    <div className="block progress-block-stats">
                        <div>Current block: {currentBlock}</div>
                        <div>Crowdsale start block: {startBlock}</div>
                        <div>Crowdsale end block: {endBlock}</div>
                        <TimeString startBlock={startBlock} endBlock={endBlock} currentBlock={currentBlock} />
                    </div>

                    <div className="block progress-raise-stats">
                        <div>Current raise: {crowdsaleBalance} ETH</div>
                        <div>SIGs created: {totalSupply}</div>
                        <div>Minimum raise: {ethMin} ETH</div>
                        <div>Maximum raise: {ethMax} ETH</div>
                    </div>

                    <div className="block progress-block-meter">
                        <CrowdsaleBlockProgress
                            startBlock={startBlock}
                            endBlock={endBlock}
                            currentBlock={currentBlock}
                        />
                    </div>

                    <div className="block logs-view">
                        <h4>Latest purchases</h4>
                        <LogsView logs={this.props.logs} />
                    </div>

                    <div className="block buy-tokens">
                        <h4>Buy SIGs</h4>

                        <ProviderString web3Provider={this.props.web3Provider} />

                        {(this.props.currentBlock >= startBlock && this.props.currentBlock <= endBlock) &&
                            <div className="form-buy-tokens">
                                Amount of ETH: <input ref={x => this._inputAmountETH = x} />
                                <button onClick={this.buyTokens}>Buy SIGs</button>
                            </div>
                        }

                        {this.state.error &&
                            <div class="error">{this.state.error}</div>
                        }

                        <hr />

                        <div className="other-instructions">
                            <p>If you would prefer buy SIGs by sending a transaction manually (either from MetaMask, geth, MyEtherWallet, or other software), send your transaction to our tokensale contract, the address of which is:</p>
                            <p><code>{crowdsaleContractAddress}</code></p>
                            <p>You will need to include the following characters in the "transaction data" field: <code>0xd0febe4c</code></p>
                            <p>The SIG token contract, which will eventually contain your SIGs, is located at the following address: <code>{tokenContractAddress}</code>.</p>
                        </div>
                    </div>
                </div>

                {/*<button onClick={this.wasteTime}>Mine a block</button>*/}
            </div>
        )
    }

    wasteTime() {
        contracts.Crowdsale.wasteTime({ from: this.props.currentAccount })
    }

    buyTokens() {
        const value = web3.toWei(this._inputAmountETH.value, 'ether')

        if (value === 0) {
            this.setState({ error: 'Must send more than 0 ETH' })
            return
        }

        contracts.Crowdsale.buyTokens({ from: this.props.currentAccount, value: value })

        this._inputAmountETH.value = ''
    }
}

export default Crowdsale


function ProviderString(props) {
    if (props.web3Provider === 'mist') {
        return <div>We've detected that you're viewing this page with the Mist browser.  You can purchase tokens directly using the form below.</div>
    } else if (props.web3Provider === 'metamask') {
        return <div>We've detected that you're viewing this page with Chrome + MetaMask.  You can purchase tokens directly using the form below.</div>
    } else {
        return <div>We've detected that you're neither running Mist, nor Chrome + MetaMask.  You'll need to manually send a transaction to purchase SIG tokens.  See our instructions for details.</div>
    }
}

function TimeString(props) {
    const { startBlock, endBlock, currentBlock } = props

    if (currentBlock < startBlock) {
        return <div>Starts in {moment().add(15 * (startBlock - currentBlock), 'seconds').fromNow(true)}</div>
    } else if (currentBlock <= endBlock) {
        return <div>Approximately {moment().add(15 * (endBlock - currentBlock), 'seconds').fromNow(true)} remaining</div>
    } else {
        return <div></div>
    }
}




