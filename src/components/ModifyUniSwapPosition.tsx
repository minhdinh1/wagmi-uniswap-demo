// import { useCallback, useState } from "react"
// import { useEthersProvider } from "../ethers"
// import { useAccount } from "wagmi"
// import { ethers } from "ethers"
// import { FeeAmount, NonfungiblePositionManager, Pool, Position, computePoolAddress } from "@uniswap/v3-sdk"
// import { getAddress, parseUnits } from "viem"
// import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
// import { CurrencyAmount, Percent } from "@uniswap/sdk-core"

// // Interfaces

// export enum TransactionState {
//   Failed = 'Failed',
//   New = 'New',
//   Rejected = 'Rejected',
//   Sending = 'Sending',
//   Sent = 'Sent',
// }

// export const ModifyUniSwapPosition = () => {
//   const provider = useEthersProvider()
//   const { address, isConnecting, isDisconnected } = useAccount() 
//   const [txState, setTxState] = useState<TransactionState>(TransactionState.New)

//   const NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS =
//   '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
//   const NONFUNGIBLE_POSITION_MANAGER_ABI = [
//     // Read-Only Functions
//     'function balanceOf(address _owner) view returns (uint256)',
//     'function tokenOfOwnerByIndex(address _owner, uint256 _index) view returns (uint256)',
//     'function tokenURI(uint256 tokenId) view returns (string memory)',
  
//     'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
//   ]
//   const token0Instance = new Token(
//     ChainId.GOERLI,
//     '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
//     18,
//     'UNI',
//     'Uniswap'
//   )
  
//   const token1Instance = new Token(
//     ChainId.GOERLI,
//     '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
//     18,
//     'WETH',
//     'Wrapped ETH'
//   )

//   const addLiquidity = async () => {
//     const currentPoolAddress = getAddress(computePoolAddress({
//       factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
//       tokenA: token0Instance,
//       tokenB: token1Instance,
//       fee: FeeAmount.MEDIUM,
//     }))
//     const poolContract = new ethers.Contract(
//       currentPoolAddress,
//       IUniswapV3PoolABI.abi,
//       provider
//     )
//     const [liquidity, slot0] =
//     await Promise.all([
//       poolContract.liquidity(),
//       poolContract.slot0(),
//     ])

//     const poolInstance = new Pool(
//       token0Instance,
//       token1Instance,
//       FeeAmount.MEDIUM,
//       slot0[0].toString(),
//       liquidity.toString(),
//       slot0[1]
//     )

//     const positionContract = new ethers.Contract(
//       NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
//       NONFUNGIBLE_POSITION_MANAGER_ABI,
//       provider
//     )

//     const position = await positionContract.positions(positionId)
//     const currentPosition = new Position({
//       pool: poolInstance,
//       liquidity: position.liquidity.toString(),
//       tickLower: position.tickLower,
//       tickUpper: position.tickUpper,
//     })

//     const addAmount0 = CurrencyAmount.fromRawAmount(
//       token0Instance,
//       parseUnits('0.5', token0Instance.decimals).toString()
//     )
  
//     const modifiedPosition = Position.fromAmount0({
//       pool: poolInstance,
//       tickLower: currentPosition.tickLower,
//       tickUpper: currentPosition.tickUpper,
//       amount0: addAmount0.quotient,
//       useFullPrecision: true,
//     })

//     const { calldata, value } = NonfungiblePositionManager.addCallParameters(
//       modifiedPosition,
//       {
//         deadline: Math.floor(Date.now() / 1000) + 60 * 20, // Transaction will expire after 1200 seconds
//         slippageTolerance: new Percent(50, 10_000), // 0.5% slippage
//         tokenId: positionId,
//       }
//     )

//     const transaction = {
//       data: calldata,
//       to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
//       value: value,
//       from: address,
//     }
//   }

//   const onAddLiquidity = useCallback(async (positionId: number) => {
//     setTxState(TransactionState.Sending)
//     setTxState()
//   }, [])

//   const positionId = 84679



//   return (
//     <div>
//       <button
//         className="button"
//         onClick={() => {
//           onAddLiquidity()
//         }}
//         disabled={
//           txState === TransactionState.Sending ||
//           isDisconnected
//         }>
//           Add Liquidity to Position {positionId}
//       </button>
//     </div>
//   )
// }