
import * as React from 'react'
import ProgressBar from 'react-progressbar.js'
var Line = ProgressBar.Line;

require('./CrowdsaleRaiseProgress.css')

const options = {
    strokeWidth: 4,
    easing: 'easeInOut',
    duration: 1400,
    color: '#4ebd93',
    trailColor: '#aaa',
    trailWidth: 1,
    // svgStyle: {width: '100%', height: '100%'},
    text: {
        style: {
            color: '#999',
            position: 'absolute',
            right: '0',
            top: '30px',
            padding: 0,
            margin: 0,
            transform: null
        },
        autoStyleContainer: false,
    },
    from: {color: '#FFEA82'},
    to: {color: '#ED6A5A'},
}

const containerStyle = {
    width: '500px',
    height: '50px'
}


class CrowdsaleRaiseProgress extends React.Component
{
    render() {
        const crowdsaleBalance = web3.fromWei(web3.toBigNumber(this.props.crowdsaleBalance), 'ether')
        const ethMax = web3.fromWei(web3.toBigNumber(this.props.ethMax), 'ether')

        const progress = ethMax.toNumber() === 0 ? 0 : crowdsaleBalance.div(ethMax).toNumber()

        return (
            <div className="component-CrowdsaleRaiseProgress">
                <Line
                    progress={progress}
                    text={`${crowdsaleBalance.toString()} ETH raised (cap: ${ethMax.toString()} ETH)`}
                    options={options}
                    initialAnimate={true}
                    containerStyle={containerStyle}
                    containerClassName={'progressbar'} />
            </div>
        )
    }
}

export default CrowdsaleRaiseProgress

