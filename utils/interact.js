import { ethers } from 'ethers';
const { createAlchemyWeb3 } = require('@alch/alchemy-web3')
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')
const whitelist = require('../scripts/whitelist.js')


const web3 = createAlchemyWeb3(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL)
import { config } from '../dapp.config'

const contract = require('../artifacts/contracts/moony00t.json')
const nftContract = new web3.eth.Contract(contract.abi, config.contractAddress)



// Calculate merkle root from the whitelist array
const leafNodes = whitelist.map((addr) => keccak256(addr))
const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true })
const root = merkleTree.getRoot()

export const getTotalMinted = async () => {
  const totalMinted = await nftContract.methods.totalSupply().call()
  return totalMinted
}

export const getMaxSupply = async () => {
  const maxSupply = await nftContract.methods.maxToken().call();
  return maxSupply
}

export const isPausedState = async () => {
  //const paused = await nftContract.methods.paused().call()
  const paused=true;
  return paused
}

export const isPublicSaleState = async () => {
  const publicSale = await nftContract.methods.publicSale().call()
  return publicSale
}

export const isPreSaleState = async () => {
  const preSale = await nftContract.methods.whitelistSale().call()
  return preSale
}

export const getPrice = async () => {
  const price = await nftContract.methods.price().call()
  return price
}

export const presaleMint = async (mintAmount) => {
  if (!window.ethereum.selectedAddress) {
    return {
      success: false,
      status: 'To be able to mint, you need to connect your wallet'
    }
  }
  const { ethereum } = window;
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const nftsContract = new ethers.Contract(config.contractAddress, config.abi, provider);

  const leaf = keccak256(window.ethereum.selectedAddress)
  const proof = merkleTree.getHexProof(leaf)

  // Verify Merkle Proof
  const isValid = merkleTree.verify(proof, leaf, root)

  if (!isValid) {
    return {
      success: false,
      status: 'Invalid Merkle Proof - You are not on the whitelist'
    }
  }

  const nonce = await web3.eth.getTransactionCount(
    window.ethereum.selectedAddress,
    'latest'
  )

  // Set up our Ethereum transaction
  const tx = {
    to: config.contractAddress,
    from: window.ethereum.selectedAddress,
    value: parseInt(
      web3.utils.toWei(String(config.price * mintAmount), 'ether')
    ).toString(16), // hex
    gas: String(30000 * mintAmount),
    data: nftContract.methods
      .mint(mintAmount, proof)
      .encodeABI(),
    nonce: nonce.toString(16)
  }

  try {
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [tx]
    })
    // let txHash = await nftsContract.mint(mintAmount,proof, { value: ethers.utils.parseEther((mintAmount*config.price)+"") });
    // await txHash.wait();
    return {
      success: true,
      status: (
        <a href={`https://rinkeby.etherscan.io/tx/${txHash}`} target="_blank">
          <p>✅ Check out your transaction on Etherscan:</p>
          <p>{`https://rinkeby.etherscan.io/tx/${txHash}`}</p>
        </a>
      )
    }
  } catch (error) {
    return {
      success: false,
      status: '😞 Smth went wrong:' + error.message
    }
  }
}

export const publicMint = async (mintAmount) => {
  if (!window.ethereum.selectedAddress) {
    return {
      success: false,
      status: 'To be able to mint, you need to connect your wallet'
    }
  }
  const { ethereum } = window;
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const nftsContract = new ethers.Contract(config.contractAddress, contract.abi, signer);
  const leaf = keccak256(window.ethereum.selectedAddress)
  const proof = merkleTree.getHexProof(leaf)

  // Verify Merkle Proof
  const isValid = merkleTree.verify(proof, leaf, root)


  const nonce = await web3.eth.getTransactionCount(
    window.ethereum.selectedAddress,
    'latest'
  )

  // Set up our Ethereum transaction
  // const tx = {
  //   to: config.contractAddress,
  //   from: window.ethereum.selectedAddress,
  //   value: parseInt(
  //     web3.utils.toWei(String(config.price * mintAmount), 'ether')
  //   ).toString(16), // hex
  //   gasPrice: '0x09184e72a000',
  //   gas: '0x2710',
  //   data: nftContract.methods
  //     .mint(mintAmount, proof)
  //     .encodeABI(),
  //   nonce: nonce.toString(16)
  // }

  try {
    // const txHash = await window.ethereum.request({
    //   method: 'eth_sendTransaction',
    //   params: [tx]
    // })
    let txHash = await nftsContract.mint(mintAmount,proof, { value: ethers.utils.parseEther((mintAmount*config.price)+"") });
    // let txHash = await nftsContract.teamAllocationMint("0x5800dD9ad88ea736A69B5Ee8ebCf4F8fCA3a821b",mintAmount);
    await txHash.wait();

    return {
      success: true,
      status: (
        <a href={`https://etherscan.io/tx/${txHash}`} target="_blank">
          <p>✅ Check out your transaction on Etherscan:</p>
          <p>{`https://etherscan.io/tx/${txHash}`}</p>
        </a>
      )
    }
  } catch (error) {
    return {
      success: false,
      status: '😞 Smth went wrong:' + error.message
    }
  }
}
