/* eslint-disable prettier/prettier */
import { Token } from '@uniswap/sdk-core'
import { FeeAmount } from '@uniswap/v3-sdk'
import { USDC_TOKEN, WETH_TOKEN, WETH_TOKEN_GOERLI, UNI_TOKEN, USDC_TEST_TOKEN } from './components/tokens'

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
    in: WETH_TOKEN_GOERLI,
    amountIn: 1,
    out: UNI_TOKEN,
    poolFee: FeeAmount.MEDIUM,
  },
}
