
import * as React from 'react'
import { nullish } from '../utils'


class AccountsList extends React.Component
{
    render() {
        const currentSIGBalance = nullish(this.props.currentSIGBalance) ? '0' : this.props.currentSIGBalance.toString()

        return (
            <div>
                <h3>Accounts</h3>

                <div>Current account: {this.props.currentAccount}</div>
                <div>{web3.fromWei(this.props.currentETHBalance, 'ether').toString()} ETH / {currentSIGBalance} SIG</div>

                <ul>
                    {this.props.accounts.map(account => <li key={account}>{account}</li>)}
                </ul>
            </div>
        )
    }
}

export default AccountsList