import { useCallback, useEffect, useState } from "react"
import { getPoolConstants } from "../libs/quote"
import { CurrentConfig } from '../config'
import { usePublicClient, useContractRead } from "wagmi"
import { quoterContractConfig } from "../components/contracts"
import { toReadableAmount, fromReadableAmount } from '../libs/conversion'
import { readContract } from '@wagmi/core'



export const Quoting = () => {
    const publicClient = usePublicClient()
    const [outputAmount, setOutputAmount] = useState<string>()
    interface PoolConstants {
        token0: string,
        token1: string,
        fee: number,
    }
    const [pool, setPool] = useState<PoolConstants>()

    useEffect(() => {
        const fetchGcreData = async () => {
            const getPoolConstant = await getPoolConstants(publicClient)
            setPool(getPoolConstant)
        }

        fetchGcreData()
            .catch(console.error)
    }, [])

    async function GetQuote() {
        if (pool){
            const  data  = await readContract({
                ...quoterContractConfig,
                functionName: 'quoteExactInputSingle',
                args: [
                    pool.token0,
                    pool.token1,
                    pool.fee,
                    fromReadableAmount(
                        CurrentConfig.tokens.amountIn,
                        CurrentConfig.tokens.in.decimals
                    ).toString(),
                    0],
            })
    
            setOutputAmount(toReadableAmount(data as number, CurrentConfig.tokens.out.decimals))
        }
    }

    return (
        <div className="App">
            <h3>{`Quote input amount: ${CurrentConfig.tokens.amountIn} ${CurrentConfig.tokens.in.symbol}`}</h3>
            <h3>{`Quote output amount: ${outputAmount} ${CurrentConfig.tokens.out.symbol}`}</h3>
            <button onClick={() => GetQuote()}>
                <p>Quote</p>
            </button>
        </div>
    )
}