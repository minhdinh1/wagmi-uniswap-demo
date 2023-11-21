import { ChainId, CurrencyAmount, Token } from "@uniswap/sdk-core"
import { FeeAmount, Pool, Position, computePoolAddress } from "@uniswap/v3-sdk"
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { useCallback, useEffect, useMemo, useState } from "react"
import { Abi, getAddress, getContract, parseUnits } from "viem"
import { useAccount, usePublicClient } from "wagmi"
import { useEthersProvider } from "../ethers"
import { BigNumber, ethers } from "ethers"

interface PoolInfo {
  token0: string
  token1: string
  fee: number
  tickSpacing: number
  sqrtPriceX96: ethers.BigNumber
  liquidity: ethers.BigNumber
  tick: number
}

export interface PositionInfo {
  tickLower: number
  tickUpper: number
  liquidity: BigNumber
  feeGrowthInside0LastX128: BigNumber
  feeGrowthInside1LastX128: BigNumber
  tokensOwed0: BigNumber
  tokensOwed1: BigNumber
  token1PriceUpper: string
  token1PriceLower: string
  token0Address: string
  token1Address: string
  poolPrice: string
  token0Amount: string
  token1Amount: string
  newAmount0: string
  newAmount1: string
  mintAmount0: string
  mintAmount1: string
}

export const GetUniSwapInfo = () => {
  return (
    <div>
      <div>
        <GetUniSwapPool />
        <br />
        <GetUniSwapPosition />
      </div>
    </div>
  )
}

const GetUniSwapPosition = () => {
  const provider = useEthersProvider()
  const { address, isConnecting, isDisconnected } = useAccount()
  const [positionIds, setPositionIds] = useState<number[]>([])
  const [positionsInfo, setPositionsInfo] = useState<PositionInfo[]>([])

  const token0Instance = new Token(
    ChainId.GOERLI,
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    18,
    'UNI',
    'Uniswap'
  )
  
  const token1Instance = new Token(
    ChainId.GOERLI,
    '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    18,
    'WETH',
    'Wrapped ETH'
  )

  const NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS =
  '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
  const NONFUNGIBLE_POSITION_MANAGER_ABI = [
    // Read-Only Functions
    'function balanceOf(address _owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address _owner, uint256 _index) view returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string memory)',
  
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  ]

  const getPositionIds = async (): Promise<number[]> => {
    if (isDisconnected)
    {
      throw new Error('Not connected')
    }

    const positionContract = new ethers.Contract(
      NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
      NONFUNGIBLE_POSITION_MANAGER_ABI,
      provider,
    )

    // Get number of positions
    const balance: number = await positionContract.balanceOf(address)
    console.log('Position balanceOf: ', balance)
    const tokenIds = []
    for (let i = 0; i < balance; i++) {
      const tokenOfOwnerByIndex: number =
        await positionContract.tokenOfOwnerByIndex(address, i)
      tokenIds.push(tokenOfOwnerByIndex)
    }

    return tokenIds
  }

  const getPositionInfo = async (tokenId: number): Promise<PositionInfo> => {
    const positionContract = new ethers.Contract(
      NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
      NONFUNGIBLE_POSITION_MANAGER_ABI,
      provider,
    )

    const position = await positionContract.positions(tokenId)
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
    const [token0, token1, fee, tickSpacing, liquidity, slot0] =
    await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.liquidity(),
      poolContract.slot0(),
    ])

    const poolInstance = new Pool(
      token0Instance,
      token1Instance,
      FeeAmount.MEDIUM,
      slot0[0].toString(),
      liquidity.toString(),
      slot0[1]
    )

    console.log(poolInstance)

    const positionObject = new Position({
      pool: poolInstance,
      liquidity: position.liquidity.toString(),
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
    })

    console.log(positionObject)

    const mintAmounts = positionObject.mintAmounts

    // Adding more liquidity to the price range
    // Need to create new position
    // Adding 0.5 token 0 (UNI)
    // Needs to know how much token 1 (WETH) to match the new liquidity

    const addAmount0 = CurrencyAmount.fromRawAmount(
      token0Instance,
      parseUnits('0.5', token0Instance.decimals).toString()
    )

    const newPosition = Position.fromAmount0({
      pool: poolInstance,
      tickLower: positionObject.tickLower,
      tickUpper: positionObject.tickUpper,
      amount0: addAmount0.quotient,
      useFullPrecision: true,
    })

    return {
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      liquidity: position.liquidity,
      feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
      feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
      tokensOwed0: position.tokensOwed0,
      tokensOwed1: position.tokensOwed1,
      token1PriceUpper: positionObject.token0PriceLower.invert().toSignificant(), // inverted token0PriceUpper is token1PriceLower
      token1PriceLower: positionObject.token0PriceUpper.invert().toSignificant(), // inverted token0PriceLower is token1PriceUpper
      token0Address: position.token0,
      token1Address: position.token1,
      poolPrice: poolInstance
        .priceOf(token0Instance)
        .toSignificant(),
      token0Amount: positionObject.amount0.toSignificant(),
      token1Amount: positionObject.amount1.toSignificant(),
      mintAmount0: mintAmounts.amount0.toString(),
      mintAmount1: mintAmounts.amount1.toString(),
      newAmount0: newPosition.amount0.toSignificant(),
      newAmount1: newPosition.amount1.toSignificant(),
    }
  }

  useEffect(() => {
    refreshPosition()
  }, [])

  const refreshPosition = useCallback(async () => {
    const ids = await getPositionIds()
    setPositionIds(ids)
    setPositionsInfo(await Promise.all(ids.map(getPositionInfo)))
  }, [])

  const positionInfoStrings: string[] = useMemo(() => {
    if (positionIds.length !== positionsInfo.length) {
      return []
    }

    return positionIds
      .map((id, index) => [id, positionsInfo[index]])
      .map((info) => {
        const id = info[0]
        const posInfo = info[1] as PositionInfo
        return `ID ${id}: ${posInfo.liquidity.toString()} liquidity, owed ${posInfo.tokensOwed0.toString()} and ${posInfo.tokensOwed1.toString()}.
          Price Range Token 1 per Token 0 Lower ${
            posInfo.token1PriceLower
          } Price Upper ${posInfo.token1PriceUpper}.
          Token0Address: ${posInfo.token0Address}, Amount0InPosition: ${
          posInfo.token0Amount
        } - Token1Address: ${posInfo.token1Address}, Amount1InPosition ${
          posInfo.token1Amount
        }
        The minimum amount needs to be deposit to mint for liquidity in position: Amount0: ${
          posInfo.mintAmount0
        } - Amount1: ${posInfo.mintAmount1}.
        -- AddLiquidity approximation: If we were to provide 0.5 UNI tokens, our new position amount would be ${
          posInfo.newAmount0
        } UNI and ${posInfo.newAmount1} ETH.
        POOL INFO: Pool Price ${
          posInfo.poolPrice
        } Token1 per Token0. From sqrtRatiox96
        Ticks (based on token 0 per token 1). Lower tick: ${
          posInfo.tickLower
        } - Upper tick: ${posInfo.tickUpper}`
      })
  }, [positionIds, positionsInfo])


  return (
    <div>
      Positions Info:{' '}
        {positionInfoStrings.map((s, i) => (
          <p key={i}>
            WebID: {i} SmartContract: {s}
          </p>
        ))}
    </div>
  )
}

const GetUniSwapPool = () => {
  const provider = useEthersProvider()
  const [poolInfo, setPoolInfo] = useState<PoolInfo>()
  const token0Instance = new Token(
    ChainId.GOERLI,
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    18,
    'UNI',
    'Uniswap'
  )
  
  const token1Instance = new Token(
    ChainId.GOERLI,
    '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    18,
    'WETH',
    'Wrapped ETH'
  )

  useEffect(() => {
    const fetchPoolData = async () => {
      
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
      const [token0, token1, fee, tickSpacing, liquidity, slot0] =
      await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.tickSpacing(),
        poolContract.liquidity(),
        poolContract.slot0(),
      ])

      setPoolInfo({
        token0: token0,
        token1: token1,
        fee: fee,
        tickSpacing: tickSpacing,
        liquidity: liquidity,
        sqrtPriceX96: slot0[0],
        tick: slot0[1]
      })
    }

    fetchPoolData()
      .catch(console.error)
  }, [])

  return (
    <div>
      <p>Pool Info</p>
      <p>Token0Address: {poolInfo?.token0}</p>
      <p>Token1Address: {poolInfo?.token1}</p>
      <p>Fee: {poolInfo?.fee}</p>
      <p>Liquidity: {poolInfo?.liquidity.toString()}</p>
      <p>Tick: {poolInfo?.tick}</p>
      <p>TickSpacing: {poolInfo?.tickSpacing}</p>
    </div>
  )
}