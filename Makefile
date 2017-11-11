
.PHONY: clean

contracts: contracts/*.sol
	truffle compile && truffle migrate --network development --reset

frontend: app/*.*
	webpack && cd build && python -m SimpleHTTPServer

clean:
	rm -rf build
