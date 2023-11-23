import { Pool, Position } from "@uniswap/v3-sdk"
import { ethers } from "ethers"

const NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS =
  '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
  const NONFUNGIBLE_POSITION_MANAGER_ABI = [
    // Read-Only Functions
    'function balanceOf(address _owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address _owner, uint256 _index) view returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string memory)',
  
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  ]

export const getPositionInstance = async (
  provider: ethers.providers.FallbackProvider | ethers.providers.JsonRpcProvider,
  poolInstance: Pool,
  positionId: number) => {

  const positionContract = new ethers.Contract(
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    provider
  )

  const position = await positionContract.positions(positionId)
  return {
    positionInstance: new Position({
      pool: poolInstance,
      liquidity: position.liquidity.toString(),
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
    }),
    tokensOwed0: position.tokensOwed0,
    tokensOwed1: position.tokensOwed1,
  }
  
}

