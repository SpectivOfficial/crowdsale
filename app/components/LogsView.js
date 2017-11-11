
import * as React from 'react'
import sortBy from 'lodash/sortBy'

require('./LogsView.css')

class LogsView extends React.Component
{
    render() {
        const logs = sortBy(this.props.logs, 'blockNumber')
        logs.reverse()

        return (
            <div className="logs">
                {logs.map(log => this.renderLog(log))}
            </div>
        )
    }

    renderLog(log) {
        if (log.event === 'LogPurchase') {
            return <LogPurchase log={log} />
        } else {
            return null
        }
    }
}

function LogPurchase(props) {
    return (
        <div key={props.log.event + ':' + props.log.transactionHash} className="log log-purchase">
            <div className="title">{props.log.args.sigs.toString()} SIGs purchased! ({web3.fromWei(props.log.args.eth, 'ether').toString()} ETH)</div>
            <div className="transaction">Transaction <a href={`http://etherscan.io/tx/${props.log.transactionHash}`}>{props.log.transactionHash.substr(0, 10)}...</a></div>
            <div className="purchaser">Bought by {props.log.args.purchaser}</div>
        </div>
    )
}

// function LogMintTokens(props) {
//     return (
//         <div key={props.log.event + ':' + props.log.transactionHash} className="log log-mint-tokens">
//             <div>{props.log.args.amount.toString()} new SIGs have been minted</div>
//         </div>
//     )
// }

export default LogsView