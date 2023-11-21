import { defineConfig } from '@wagmi/cli'
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'

export default defineConfig({
  out: 'src/generated.ts',
  contracts: [],
  plugins: [],
})
