import { useCallback, useEffect, useState } from "react"
import { CurrentConfig } from '../config'
import { createTrade, executeTrade, TokenTrade } from '../libs/trading'
import { displayTrade } from '../utils/utils'
import { useEthersProvider } from "../ethers"
import { erc20ABI, useAccount, useNetwork } from 'wagmi'
import { Currency } from '@uniswap/sdk-core'
import { BigNumber, ethers, providers } from 'ethers'
import { toReadableAmount } from '../libs/conversion'


export enum TransactionState {
  Failed = 'Failed',
  New = 'New',
  Rejected = 'Rejected',
  Sending = 'Sending',
  Sent = 'Sent',
}

export const Trading = () => {
  const provider = useEthersProvider()
  const { address } = useAccount()
  const [trade, setTrade] = useState<TokenTrade>()
  const [txState, setTxState] = useState<TransactionState>(TransactionState.New)

  const [tokenInBalance, setTokenInBalance] = useState<string>()
  const [tokenOutBalance, setTokenOutBalance] = useState<string>()

  async function getCurrencyBalance(
    provider: providers.Provider,
    address: string,
    currency: Currency
  ): Promise<string> {
    // Handle ETH directly
    if (currency.isNative) {
      return ethers.utils.formatEther(await provider.getBalance(address))
    }
  
    // Get currency otherwise
    const ERC20Contract = new ethers.Contract(
      currency.address,
      erc20ABI,
      provider
    )
    const balance: number = await ERC20Contract.balanceOf(address)
    const decimals: number = await ERC20Contract.decimals()
  
    // Format with proper units (approximate)
    return toReadableAmount(balance, decimals)
  }
  const onCreateTrade = useCallback(async () => {
    setTrade(await createTrade(provider))
  }, [])

  const onGetBalances = useCallback(async () => {
    setTokenInBalance(
      await getCurrencyBalance(provider, address as string, CurrentConfig.tokens.in)
    )
    setTokenOutBalance(
      await getCurrencyBalance(provider, address as string, CurrentConfig.tokens.out)
    )
  }, [])

  const onTrade = useCallback(async (trade: TokenTrade | undefined) => {
    if (trade) {
      setTxState(await executeTrade(trade, provider, address))
    }
  }, [])

  return (
    <div className="App">
      <h3>
        Trading {CurrentConfig.tokens.amountIn} {CurrentConfig.tokens.in.symbol}{' '}
        for {CurrentConfig.tokens.out.symbol}
      </h3>
      <button onClick={onGetBalances}>
        <p>Get Balances</p>
      </button>
      <h3>{trade && `Constructed Trade: ${displayTrade(trade)}`}</h3>
      <button onClick={onCreateTrade}>
        <p>Create Trade</p>
      </button>
      <h3>{`Transaction State: ${txState}`}</h3>
      <h3>{`${CurrentConfig.tokens.in.symbol} Balance: ${tokenInBalance}`}</h3>
      <h3>{`${CurrentConfig.tokens.out.symbol} Balance: ${tokenOutBalance}`}</h3>
      <button
        onClick={() => onTrade(trade)}>
        <p>Trade</p>
      </button>
    </div>
  )
}