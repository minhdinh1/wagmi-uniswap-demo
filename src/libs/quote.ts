/* eslint-disable prettier/prettier */
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { poolFactoryContractConfig } from "../components/contracts"
import { PublicClient } from "wagmi"
import { CurrentConfig } from '../config'
import { computePoolAddress } from '@uniswap/v3-sdk'
import { getContract } from "viem"
import type {
  Address,
} from 'abitype'

export async function getPoolConstants(publicClient: PublicClient): Promise<{
  token0: string
  token1: string
  fee: number
}> {
  const currentPoolAddress = computePoolAddress({
    factoryAddress: poolFactoryContractConfig.address,
    tokenA: CurrentConfig.tokens.in,
    tokenB: CurrentConfig.tokens.out,
    fee: CurrentConfig.tokens.poolFee,
  })
  

  const poolContract = getContract({
    ...{
      address: currentPoolAddress as Address,
      abi: IUniswapV3PoolABI.abi,
    } as const,
    publicClient,
  })

  const [token0, token1, fee] = await Promise.all([
    poolContract.read.token0() as unknown as string,
    poolContract.read.token1() as unknown as string,
    poolContract.read.fee() as unknown as number,
  ])

  return {
    token0,
    token1,
    fee,
  }
}
