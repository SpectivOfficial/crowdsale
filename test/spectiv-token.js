let Promise = require('bluebird')
let SigToken = artifacts.require('./SigToken.sol')
let helpers = require('./helpers')
let expectThrow = helpers.expectThrow
let { wait, waitUntilBlock } = require('@digix/tempo')(web3)

if (typeof web3.eth.getAccountsPromise !== 'function') {
    Promise.promisifyAll(web3.eth, { suffix: 'Promise' })
}

contract(`SigToken`, accounts => {
    const admin = accounts[0]

    let sigToken
    beforeEach(async () => {
        sigToken = await SigToken.new({ from: admin })
    })


    it(`should reflect the startingSupply in its totalSupply before any new tokens have been minted`, async () => {
        const totalSupply = await sigToken.totalSupply()
        assert.equal(totalSupply, 0)
    })

    it(`should set mintMaster to the deploying account`, async () => {
        const mintMaster = await sigToken.mintMaster()
        assert.equal(mintMaster, admin)
    })

    it(`should set upgradeMaster to the deploying account`, async () => {
        const upgradeMaster = await sigToken.upgradeMaster()
        assert.equal(upgradeMaster, admin)
    })

    //
    // setMintMaster
    //
    describe(`setMintMaster()`, () => {
        it(`if it's not being called by the current mintMaster, it should throw`, async () => {
            await expectThrow( sigToken.setMintMaster(accounts[3], { from: accounts[1] }) )
        })

        describe(`if it's being called by the current mintMaster`, () => {
            it(`should set the new mintMaster`, async () => {
                await sigToken.setMintMaster(accounts[3], { from: admin })

                const mintMaster = await sigToken.mintMaster()
                assert.equal(mintMaster, accounts[3])
            })

            it(`should not let the old mintMaster mint tokens`, async () => {
                await sigToken.setMintMaster(accounts[3], { from: admin })
                await expectThrow( sigToken.mintTokens(accounts[1], 12345, { from: admin }) )
            })
        })
    })

    //
    // mintTokens
    //
    describe(`mintTokens()`, () => {
        const recipient1 = accounts[1]
        const recipient2 = accounts[2]
        const amount1 = 10000
        const amount2 = 4032

        it(`should throw if it's not being called by mintMaster`, async () => {
            await expectThrow( sigToken.mintTokens(recipient1, amount1, { from: recipient1 }) )
        })

        it(`should throw if it's told to mint 0 tokens`, async () => {
            await expectThrow( sigToken.mintTokens(recipient1, 0, { from: admin }) )
        })

        describe(`when called by mintMaster with a nonzero amount`, () => {
            it(`should increase totalSupply by the correct amount`, async () => {
                await sigToken.mintTokens(recipient1, amount1, { from: admin })
                await sigToken.mintTokens(recipient2, amount2, { from: admin })

                const totalSupply = await sigToken.totalSupply()
                assert.equal(totalSupply, amount1 + amount2, `totalSupply is incorrect`)
            })

            it(`should increase balanceOf(recipient) by the correct amount`, async () => {
                await sigToken.mintTokens(recipient1, amount1, { from: admin })
                await sigToken.mintTokens(recipient2, amount2, { from: admin })

                const balance1 = await sigToken.balanceOf(recipient1)
                assert.equal(balance1, amount1, `balanceOf(${recipient1}) is incorrect`)

                const balance2 = await sigToken.balanceOf(recipient2)
                assert.equal(balance2, amount2, `balanceOf(${recipient2}) is incorrect`)
            })
        })
    })

    //
    // unmintTokens
    //
    describe(`unmintTokens()`, () => {
        const recipient = accounts[1]
        const amount = 10000

        beforeEach(async () => {
            await sigToken.mintTokens(recipient, amount, { from: admin })
        })

        it(`should throw if it's not being called by mintMaster`, async () => {
            await expectThrow( sigToken.unmintTokens(recipient, 1, { from: recipient }) )
        })

        it(`should throw if it's told to unmint 0 tokens`, async () => {
            await expectThrow( sigToken.unmintTokens(recipient, 0, { from: admin }) )
        })

        it(`should throw if it's told to unmint more tokens than a given account possesses`, async () => {
            await expectThrow( sigToken.unmintTokens(recipient, amount + 1, { from: admin }) )
        })

        describe(`when called by mintMaster with a nonzero amount on an account with enough tokens`, () => {
            const unmintAmount = amount - 1000

            it(`should decrease totalSupply by the correct amount`, async () => {
                await sigToken.unmintTokens(recipient, unmintAmount, { from: admin })

                const totalSupply = await sigToken.totalSupply()
                assert.equal(totalSupply, amount - unmintAmount, `totalSupply is incorrect`)
            })

            it(`should decrease balanceOf(recipient) by the correct amount`, async () => {
                await sigToken.unmintTokens(recipient, unmintAmount, { from: admin })

                const balance = await sigToken.balanceOf(recipient)
                assert.equal(balance, amount - unmintAmount, `balanceOf(${recipient}) is incorrect`)
            })
        })
    })

    //
    // balanceOf
    //
    describe(`balanceOf()`, () => {
        it(`should return the correct number of tokens for a given address`, async () => {
            const recipient = accounts[1]
            const amount = 100

            await sigToken.mintTokens(recipient, amount, { from: admin })

            const balance = await sigToken.balanceOf(recipient)
            assert.equal(balance, amount, `balanceOf(${recipient}) is incorrect`)
        })
    })

    //
    // transfer
    //
    describe(`transfer()`, () => {
        it(`should throw if the tokensale has not been completed`, async () => {
            const recipient = accounts[1]
            const amount = 100

            await sigToken.mintTokens(admin, amount, { from: admin })
            await expectThrow( sigToken.transfer(recipient, amount, { from: admin }) )
        })

        it(`should throw if more tokens are being transferred than exist in the sending account`, async () => {
            const recipient = accounts[1]
            const amount = 100

            await sigToken.mintTokens(admin, amount, { from: admin })
            await sigToken.setCrowdsaleCompleted({ from: admin })
            await expectThrow( sigToken.transfer(recipient, amount + 1, { from: admin }) )
        })

        describe(`when called after the crowdsale is completed by an account with enough tokens`, () => {
            it(`should transfer tokens from one account to another`, async () => {
                const recipient = accounts[1]
                const amount = 100

                await sigToken.mintTokens(admin, amount, { from: admin })
                await sigToken.setCrowdsaleCompleted({ from: admin })

                let adminBalance = await sigToken.balanceOf(admin)
                assert.equal(adminBalance, amount)

                let recipientBalance = await sigToken.balanceOf(recipient)
                assert.equal(recipientBalance, 0)

                await sigToken.transfer(recipient, amount, { from: admin })

                adminBalance = await sigToken.balanceOf(admin)
                assert.equal(adminBalance, 0)

                recipientBalance = await sigToken.balanceOf(recipient)
                assert.equal(recipientBalance, amount)
            })
        })
    })

    //
    // approve()
    //
    describe(`approve()`, () => {
        it(`should throw if the crowdsale is not yet completed`, async () => {
            await expectThrow( sigToken.approve(accounts[1], 123, { from: admin }) )
        })

        it(`should throw if a nonzero approval/allowance has already been made and not redemeed`, async () => {
            await sigToken.setCrowdsaleCompleted({ from: admin })
            await sigToken.approve(accounts[1], 123, { from: admin })
            await expectThrow( sigToken.approve(accounts[1], 123, { from: admin }) )
        })

        describe(`when called after the crowdsale is completed and the current allowance is 0`, () => {
            it(`should set .allowed[sender][spender] to value`, async () => {
                const value = 123

                await sigToken.setCrowdsaleCompleted({ from: admin })
                await sigToken.approve(accounts[1], value, { from: admin })

                const allowance = await sigToken.allowance(admin, accounts[1])
                assert.equal(allowance, value)
            })
        })
    })


    //
    // transferFrom()
    //
    describe(`transferFrom()`, () => {
        const recipient = accounts[1]
        const amount = 10

        it(`should throw if no amount has been approved`, async () => {
            await sigToken.mintTokens(admin, 100, { from: admin })
            await sigToken.setCrowdsaleCompleted({ from: admin })
            await expectThrow( sigToken.transferFrom(admin, recipient, 1, { from: admin }) )
        })

        it(`should throw if too small an amount has been approved`, async () => {
            await sigToken.mintTokens(admin, 100, { from: admin })
            await sigToken.setCrowdsaleCompleted({ from: admin })
            await sigToken.approve(recipient, amount, { from: admin })
            await expectThrow( sigToken.transferFrom(admin, recipient, amount + 1, { from: accounts[2] }) )
        })

        describe(`when called after the crowdsale is completed with an amount that has been approved`, () => {
            it(`should transfer tokens from one account to another`, async () => {
                await sigToken.mintTokens(admin, 100, { from: admin })
                await sigToken.setCrowdsaleCompleted({ from: admin })

                let adminBalance = await sigToken.balanceOf(admin)
                assert.equal(adminBalance, 100)

                let recipientBalance = await sigToken.balanceOf(recipient)
                assert.equal(recipientBalance, 0)

                await sigToken.approve(recipient, amount, { from: admin })
                await sigToken.transferFrom(admin, recipient, amount, { from: recipient })

                adminBalance = await sigToken.balanceOf(admin)
                assert.equal(adminBalance, 100 - amount)

                recipientBalance = await sigToken.balanceOf(recipient)
                assert.equal(recipientBalance, amount)
            })
        })
    })
})


