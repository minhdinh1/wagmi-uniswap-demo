import { Token } from "@uniswap/sdk-core"
import { FeeAmount, Pool, computePoolAddress } from "@uniswap/v3-sdk"
import { ethers } from "ethers"
import { getAddress } from "viem"
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'

export const getPoolInstance = async (
  provider: ethers.providers.FallbackProvider | ethers.providers.JsonRpcProvider,
  token0Instance: Token,
  token1Instance: Token): Promise<Pool> => {
  const currentPoolAddress = getAddress(computePoolAddress({
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    tokenA: token0Instance,
    tokenB: token1Instance,
    fee: FeeAmount.MEDIUM,
  }))
  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    provider
  )
  const [liquidity, slot0] =
  await Promise.all([
    poolContract.liquidity(),
    poolContract.slot0(),
  ])

  return new Pool(
    token0Instance,
    token1Instance,
    FeeAmount.MEDIUM,
    slot0[0].toString(),
    liquidity.toString(),
    slot0[1]
  )
}