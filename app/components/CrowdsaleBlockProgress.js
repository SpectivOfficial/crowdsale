
import * as React from 'react'
const ProgressBar = require('react-progress-label')

const progressBarTextStyle = {
    fill: '#e8e8e8',
    textAnchor: 'middle',
    fontFamily: 'Helvetica Neue, Helvetica, sans-serif',
    fontSize: '1.4rem',
    fontWeight: 200,
}

require('./CrowdsaleBlockProgress.css')


class CrowdsaleBlockProgress extends React.Component
{
    render() {
        const { currentBlock, startBlock, endBlock } = this.props

        let progressColor, blockProgress, textLine1, textLine2

        if (currentBlock < startBlock) {
            progressColor = '#999'
            blockProgress = 100
            textLine1 = `${startBlock - currentBlock} blocks`
            textLine2 = 'until funding begins'
        } else if (currentBlock < endBlock) {
            progressColor = '#4ebd93'
            blockProgress = (currentBlock === 0 || startBlock === 0 || endBlock === 0) ? 0 : 100 * ((currentBlock - startBlock) / (endBlock - startBlock))
            textLine1 = `${endBlock - currentBlock} blocks`
            textLine2 = 'remaining'
        } else {
            progressColor = '#4ebd93'
            blockProgress = 100
            textLine1 = 'The crowdsale'
            textLine2 = 'is over.'
        }

        return (
            <div className="component-CrowdsaleBlockProgress">
                <ProgressBar
                    progress={blockProgress}
                    startDegree={200}
                    progressWidth={14}
                    trackWidth={3}
                    cornersWidth={6}
                    size={200}
                    fillColor="transparent"
                    trackColor="#aaa"
                    progressColor={progressColor}>

                    <text x="100" y="85" style={progressBarTextStyle}>{textLine1}</text>
                    <text x="100" y="115" style={progressBarTextStyle}>{textLine2}</text>
                </ProgressBar>
            </div>
        )
    }
}

export default CrowdsaleBlockProgress

