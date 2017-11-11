# SpectivVR Signal Token Crowdsale

## usage

Install NPM dependencies:

```sh
$ npm install
```

Open a new terminal and start up TestRPC:

```sh
$ testrpc
```

Compile the contracts and deploy them to the development network (testrpc or private geth):

```sh
$ make contracts
```

Build the frontend and serve it at <http://localhost:8000/index.html>:

```sh
$ make frontend
```

Clean the build folder:

```sh
$ make clean
```


## testing

Open a new terminal and start up TestRPC:

```sh
$ testrpc
```

Run the tests:

```sh
$ truffle test
```
