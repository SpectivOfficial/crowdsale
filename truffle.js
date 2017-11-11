module.exports = {
  rpc: {
    host: 'localhost',
    port: 8545,
    gas: 100000000,
    // gas: 4000000,
  },
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*",
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      network_id: 3,
    },
    rinkeby: {
      host: "localhost",
      port: 8545,
      network_id: 4,
    },
  },
  migrations_directory: './migrations'
}
