import { Token, TradeType } from '@uniswap/sdk-core'
import { Trade } from '@uniswap/v3-sdk'

export function displayTrade(trade: Trade<Token, Token, TradeType>): string {
    return `${trade.inputAmount.toExact()} ${trade.inputAmount.currency.symbol
        } for ${trade.outputAmount.toExact()} ${trade.outputAmount.currency.symbol}`
}