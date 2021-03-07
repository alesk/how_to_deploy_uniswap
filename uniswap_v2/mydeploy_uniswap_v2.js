const fs = require('fs');
const Web3 = require("web3");
const HDWalletProvider = require('truffle-hdwallet-provider');

const installation_data_file = '../installation_data.json';
const deployed_contracts_file = '../deployed_contracts.json';

const data = JSON.parse(fs.readFileSync(installation_data_file).toString());

let deployed_contracts = {};

if (fs.existsSync(deployed_contracts_file)) {
    deployed_contracts = JSON.parse(fs.readFileSync(deployed_contracts_file));
}

/*
const contracts_addresses = {
    uniswap_v2: '0xc9CAEB1172496a2BB496760fDE22Bf95d37408ED',
    weth: '0xd69Acc7e9488d84031CD98a2038a423672Da2220',
    router: '0x3F1a5fd830C50Da2cd5371E7f79c0E5b8E9b097B',
    multicall: '0x26B24541E4BC202CA7bAc7cdBDa6E106722180D3',
    migrator: '0x35C1cE2DBB9Fc919007324aB8178A63B0ad77c84',
    ens_registry: '0x259936c72B7fCb0B2a13A87821C5568D9336E1e3',
    gas_relay_hub_address: '0x8Df5a43a695287f78dc2a9FE79fC224F5C7B6817'
}
*/

let deployContract = async function (name, web3, owner) {

    let contractAddress = deployed_contracts[name];
    let abi = data.abi[name];
    let bytecode = data.bytecode[name];

    if (!contractAddress) {
        let contract = await web3.eth.sendTransaction({
            from: owner,
            data: bytecode})
            .on('error', console.error)
            .on('transactionHash', transactionHash => console.log('Contract %s deployed with transaction Hash is %s', name, transactionHash))
            .then(x => {
                contractAddress = x.contractAddress;
                console.log('%s is was mined in block %d and has address: %s', name, x.blockNumber, x.contractAddress)
            });
    } else {
        console.log('Contract \033[35m%s\033[0m already deployed at %s', name, contractAddress);
    }

    let instance = new web3.eth.Contract(abi, contractAddress, {from: owner});
    return instance;
}


let main = async function() {

    const provider = new HDWalletProvider(
        [data.private_key.alice, data.private_key.bob, data.private_key.charlie], data.provider.rpc_endpoint, 0, 3)
    const web3 = new Web3(provider);
    await web3.eth.net.isListening();

    let [alice, bob, charlie] = await web3.eth.getAccounts();

    // Uniswap V2
    let uniswapV2 = await deployContract('uniswap_v2', web3, charlie)
    deployed_contracts['uniswap_v2'] = uniswapV2._address;

    await uniswapV2.methods.feeTo().call().then(x => console.log('Fee to is %s', x));
    await uniswapV2.methods.feeToSetter().call().then(x => console.log('Fee to setter  is %s', x));

    // Uniswap WETH
    let weth = await deployContract('weth', web3, charlie)
    deployed_contracts['weth'] = weth._address;

    // Uniswap V2 Router
    let router = await deployContract('router', web3, charlie)
    deployed_contracts['router'] = router._address;

    // Uniswap Multicall
    let multicall = await deployContract('multicall', web3, charlie)
    deployed_contracts['multicall'] = multicall._address;

    // Uniswap Migrator
    let migrator = await deployContract('migrator', web3, charlie)
    deployed_contracts['migrator'] = migrator._address;


    // ENS registry 
    let ens_registry = await deployContract('ens_registry', web3, charlie)
    deployed_contracts['ens_registry'] = ens_registry._address;

    // Gas relay
    let gas_relay_hub_address = await deployContract('gas_relay_hub_address', web3, charlie)
    deployed_contracts['gas_relay_hub_address'] = gas_relay_hub_address._address;


    
    console.log('Deployed contract addresses written to %s', deployed_contracts_file);
    fs.writeFileSync(deployed_contracts_file, JSON.stringify(deployed_contracts, null, 4));
    provider.engine.stop();
}

main()