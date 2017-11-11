
import * as React from 'react'
import AccountsList from './AccountsList'
import Crowdsale from './Crowdsale'

require('./App.css')

class App extends React.Component
{
    render() {
        return (
            <div>
                {/*<AccountsList
                    accounts={this.props.appState.accounts}
                    currentAccount={this.props.appState.currentAccount}
                />*/}

                <div className="main">
                    <header>
                        <img className="logo" src="https://daks2k3a4ib2z.cloudfront.net/58fd371467a8320d4f29aed3/5911aa3168856d32e4be611b_fb%20logo%20(1).png" />
                        <img className="spectiv-text" src="https://daks2k3a4ib2z.cloudfront.net/58fd371467a8320d4f29aed3/590e564c4fdf3a766b79354f_textlogo%20green-p-1080.png" />
                    </header>

                    <h3>Crowdsale</h3>

                    <Crowdsale
                        web3Provider={this.props.appState.web3Provider}
                        currentBlock={this.props.appState.currentBlock}
                        currentAccount={this.props.appState.currentAccount}
                        crowdsaleParameters={this.props.appState.crowdsaleParameters}
                        crowdsaleState={this.props.appState.crowdsaleState}
                        tokenState={this.props.appState.tokenState}
                        logs={this.props.appState.logs}
                    />
                </div>
            </div>
        )
    }
}

export default App