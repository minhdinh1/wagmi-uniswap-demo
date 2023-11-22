/* eslint-disable prettier/prettier */
import { Token } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'
import { USDC_TOKEN, WETH_TOKEN, WETH_TOKEN_GOERLI, UNI_TOKEN, USDC_TEST_TOKEN } from './components/tokens'
import { createWalletClient, custom } from 'viem'

// Retrieve Account from an EIP-1193 Provider.
const [account] = await window.ethereum.request({ 
  method: 'eth_requestAccounts' 
})

export const walletClient = createWalletClient({
  account,
  transport: custom(window.ethereum)
})
// Inputs that configure this example to run
export interface ExampleConfig {
  tokens: {
    in: Token
    amountIn: number
    out: Token
    poolFee: number
  }
}

// Example Configuration

export const CurrentConfig: ExampleConfig = {
  tokens: {
    in: UNI_TOKEN,
    amountIn: 0.00001,
    out: WETH_TOKEN_GOERLI,
    poolFee: FeeAmount.MEDIUM,
  },
}
