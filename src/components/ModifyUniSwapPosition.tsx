import { useCallback, useState } from "react"
import { useEthersProvider, useEthersSigner } from "../ethers"
import { erc20ABI, useAccount, useWalletClient } from "wagmi"
import { ethers } from "ethers"
import { CollectOptions, FeeAmount, MintOptions, NonfungiblePositionManager, Pool, Position, RemoveLiquidityOptions, TickMath, computePoolAddress, encodeSqrtRatioX96, nearestUsableTick } from "@uniswap/v3-sdk"
import { PrepareTransactionRequestReturnType, createWalletClient, fromHex, getAddress, parseEther, parseUnits } from "viem"
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { ChainId, CurrencyAmount, Percent, Token } from "@uniswap/sdk-core"
import { getPoolInstance } from "../utils/getPoolInstance"
import { getPositionInstance } from "../utils/getPositionInstance"

// Interfaces
export enum TransactionState {
  Failed = 'Failed',
  New = 'New',
  Rejected = 'Rejected',
  Sending = 'Sending',
  Sent = 'Sent',
}

export const ModifyUniSwapPosition = () => {
  const provider = useEthersProvider()
  const signer = useEthersSigner()
  
  const { address, isConnecting, isDisconnected } = useAccount() 
  const [txState, setTxState] = useState<TransactionState>(TransactionState.New)
  // const {data: walletClient, isError, isLoading, isFetched, isFetchedAfterMount, isFetching, isSuccess} = useWalletClient()

  const currentPositionId = 84679
  
  const NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS =
  '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
  const NONFUNGIBLE_POSITION_MANAGER_ABI = [
    // Read-Only Functions
    'function balanceOf(address _owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address _owner, uint256 _index) view returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string memory)',
  
    'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  ]

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

  // const sendTransaction = async (request: PrepareTransactionRequestReturnType | undefined): Promise<TransactionState> => {
  //   try {
  //     const signature = await walletClient?.signTransaction(request!)
  //     const hash = await walletClient?.sendRawTransaction({serializedTransaction: signature!})

  //     if (hash) {
  //       return TransactionState.Sent
  //     } else {
  //       return TransactionState.Failed
  //     }
  //   }
  //   catch (e)
  //   {
  //     console.error(e)
  //     return TransactionState.Rejected
  //   }
  // }

  const sendTransactionSigner = async (
    transaction: ethers.providers.TransactionRequest): Promise<TransactionState> => {
    if (!signer) {
      console.error('signer is not initialized')
      return TransactionState.Failed
    }
  
    let receipt = null
    try {
      console.log('Sending Transaction: ', transaction)
      console.log('Signer: ', signer)
      const txRes = await signer.sendTransaction(transaction)
      console.log(txRes)
      
      while (receipt === null) {
        receipt = await provider.getTransactionReceipt(txRes!.hash)
  
        if (receipt === null) {
          continue
        }
      }
    }
    catch (e) {
      console.error(`Error:`, e)
      return TransactionState.Failed
    }
    // Transaction was successful if status === 1
    if (receipt) {
      return TransactionState.Sent
    } else {
      return TransactionState.Failed
    }
  }

  const getTokenTransferApproval = async (
    token: Token,
    amountToApprove: CurrencyAmount<Token>,
  ): Promise<TransactionState> => {
    if (!signer) {
      console.error('No Signer Found')
      return TransactionState.Failed
    }
  
    if (amountToApprove.currency.address != token.address) {
      console.log('CurrencyAmount does not match with Token')
      return TransactionState.Failed
    }
  
    try {
      const tokenContract = new ethers.Contract(
        token.address,
        erc20ABI,
        provider
      )
      console.log('Approving amount: %d', amountToApprove.quotient)
      console.log('Amount object: ', amountToApprove)
      const rawAmountToApprove = ethers.utils.parseUnits(
        amountToApprove.toExact(),
        amountToApprove.currency.decimals
      )
      console.log('raw amount typeof: ', typeof rawAmountToApprove)
      const transaction = await tokenContract.populateTransaction.approve(
        NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
        rawAmountToApprove
      )
  
      return sendTransactionSigner(
        {
          ...transaction,
          from: address
        }
      )
    } catch (e) {
      console.error(e)
      return TransactionState.Failed
    }
  }

  const addLiquidity = async (positionId: number) => {
    const poolInstance = await getPoolInstance(provider, token0Instance, token1Instance)

    const { positionInstance: currentPosition } = await getPositionInstance(provider, poolInstance, positionId)

    const addAmount0 = CurrencyAmount.fromRawAmount(
      token0Instance,
      parseUnits('0.5', token0Instance.decimals).toString()
    )
  
    const modifiedPosition = Position.fromAmount0({
      pool: poolInstance,
      tickLower: currentPosition.tickLower,
      tickUpper: currentPosition.tickUpper,
      amount0: addAmount0.quotient,
      useFullPrecision: true,
    })

    const tokenInApproval = await getTokenTransferApproval(
      token0Instance,
      modifiedPosition.amount0.add(modifiedPosition.amount0),
    )
    const tokenOutApproval = await getTokenTransferApproval(
      token1Instance,
      modifiedPosition.amount1.add(modifiedPosition.amount1)
    )
  
    if (
      tokenInApproval !== TransactionState.Sent ||
      tokenOutApproval !== TransactionState.Sent
    ) {
      return TransactionState.Failed
    }

    const { calldata, value } = NonfungiblePositionManager.addCallParameters(
      modifiedPosition,
      {
        deadline: Math.floor(Date.now() / 1000) + 60 * 20, // Transaction will expire after 1200 seconds
        slippageTolerance: new Percent(50, 10_000), // 0.5% slippage
        tokenId: positionId,
      }
    )

    // console.log('WalletClient: ', walletClient)
    // if (isError) console.error('WalletClient is not loaded')

    // console.log('WalletConnect loading? ', isLoading)
    // console.log('WalletConnect error? ', isError)
    // console.log('WalletConnect success? ', isSuccess)
    // console.log('WalletConnect isFetching? ', isFetching)
    
    // Until I get this to work
    // const request = await walletClient?.prepareTransactionRequest({
    //   to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    //   data: calldata as '0x${string}',
    //   value: fromHex(value as '0x{string}', 'bigint'),
    // })
    
    // console.log('Request: ', request)
    // return sendTransaction(request)

    const transaction = {
      data: calldata,
      to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
      value: value,
      from: address,
    }
    console.log(transaction)
    return sendTransactionSigner(
      transaction)

    // return TransactionState.Sent
  }

  const collectFee = async (positionId: number): Promise<TransactionState> => {
    const collectOptions: CollectOptions = {
      tokenId: positionId,
      expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(
        token0Instance,
        parseUnits('10', token0Instance.decimals).toString() // Expect to collect max 10 UNI as fee
      ),
      expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(
        token1Instance,
        parseUnits('1', token1Instance.decimals).toString() // Expect to collect max 1 ETH as fee
      ),
      recipient: address!,
    }
  
    // get calldata for minting a position
    const { calldata, value } =
      NonfungiblePositionManager.collectCallParameters(collectOptions)
  
    // build transaction
    const transaction = {
      data: calldata,
      to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
      value: value,
      from: address,
      // maxFeePerGas: MAX_FEE_PER_GAS,
      // maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    }
  
    return sendTransactionSigner(
      transaction)
  }

  const mintPosition = async () => {
    const poolInstance = await getPoolInstance(provider, token0Instance, token1Instance)
    const rawAmount0 = parseUnits('0.5', token0Instance.decimals) // 2 UNI, decimals 18

    // Make sure that the price is always token 1/token 0 when interacting with the smart contract
    const priceLower = 0.067 * 1000
    const priceUpper = 0.1 * 1000

    const sqrtRatioAX96 = encodeSqrtRatioX96(priceLower, 1000) // 0.067 ETH per 1 UNI
    const sqrtRatioBX96 = encodeSqrtRatioX96(priceUpper, 1000) // 0.1 ETH per 1 UNI

    const tickLower = nearestUsableTick(
      TickMath.getTickAtSqrtRatio(sqrtRatioAX96),
      poolInstance.tickSpacing
    )
    const tickUpper = nearestUsableTick(
      TickMath.getTickAtSqrtRatio(sqrtRatioBX96),
      poolInstance.tickSpacing
    )

    const positionToMint = Position.fromAmount0({
      pool: poolInstance,
      tickLower: tickLower,
      tickUpper: tickUpper,
      amount0: rawAmount0.toString(),
      useFullPrecision: true,
    })

    // Give approval to the contract to transfer tokens
    const tokenInApproval = await getTokenTransferApproval(
      token0Instance,
      positionToMint.amount0.add(positionToMint.amount0)
    )
    const tokenOutApproval = await getTokenTransferApproval(
      token1Instance,
      positionToMint.amount1.add(positionToMint.amount1)
    )

    if (
      tokenInApproval !== TransactionState.Sent ||
      tokenOutApproval !== TransactionState.Sent
    ) {
      return TransactionState.Failed
    }

    const mintOptions: MintOptions = {
      recipient: address!,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      slippageTolerance: new Percent(50, 10_000),
    }

    // get calldata for minting a position
    const { calldata, value } = NonfungiblePositionManager.addCallParameters(
      positionToMint,
      mintOptions
    )

    // build transaction
    const transaction = {
      data: calldata,
      to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
      value: value,
      from: address,
      // maxFeePerGas: MAX_FEE_PER_GAS, // This cause gas to spike
      // maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS, // This cause gas to spike
    }

    return sendTransactionSigner(
      transaction)
  }

  const removeLiquidity = async (positionId: number): Promise<TransactionState> => {
    const poolInstance = await getPoolInstance(provider, token0Instance, token1Instance)
    const { positionInstance: currentPosition, tokensOwed0, tokensOwed1 } = await getPositionInstance(provider, poolInstance, positionId)

    const collectOptions: Omit<CollectOptions, 'tokenId'> = {
      expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(
        token0Instance,
        tokensOwed0
      ),
      expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(
        token1Instance,
        tokensOwed1
      ),
      recipient: address!,
    }
  
    const removeLiquidityOptions: RemoveLiquidityOptions = {
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      slippageTolerance: new Percent(50, 10_000),
      tokenId: positionId,
      // percentage of liquidity to remove
      liquidityPercentage: new Percent(1), // Remove all
      collectOptions,
    }
    // get calldata for minting a position
    const { calldata, value } = NonfungiblePositionManager.removeCallParameters(
      currentPosition,
      removeLiquidityOptions
    )

    // build transaction
    const transaction = {
      data: calldata,
      to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
      value: value,
      from: address,
      // maxFeePerGas: MAX_FEE_PER_GAS, // This cause the gas price to spike hard
      // maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS, // This cause the gas price to spike hard
    }

    return sendTransactionSigner(
      transaction)
  }

  const onAddLiquidity = useCallback(async (positionId: number) => {
    setTxState(TransactionState.Sending)
    setTxState(await addLiquidity(positionId))
  }, [signer, provider])

  const onCollectFee = useCallback(async (positionId: number) => {
    setTxState(TransactionState.Sending)
    setTxState(await collectFee(positionId))
  }, [signer, provider])

  const onMintPosition = useCallback(async () => {
    setTxState(TransactionState.Sending)
    setTxState(await mintPosition())
  }, [signer, provider])

  const onRemoveLiquidity = useCallback(async (positionId: number) => {
    setTxState(TransactionState.Sending)
    setTxState(await removeLiquidity(positionId))
  }, [signer, provider])

  return (
    <div>
      <button
        className="button"
        onClick={() => {
          onAddLiquidity(currentPositionId)
        }}
        disabled={
          txState === TransactionState.Sending ||
          // isLoading ||
          // isError ||
          // !isSuccess ||
          // isFetching ||
          // walletClient === undefined ||
          isDisconnected
        }>
          Add Liquidity to Position {currentPositionId}
      </button>
      <button
        className="button"
        onClick={() => {
          onCollectFee(currentPositionId)
        }}
        disabled={
          txState === TransactionState.Sending ||
          // isLoading ||
          // isError ||
          // !isSuccess ||
          // isFetching ||
          // walletClient === undefined ||
          isDisconnected
        }>
          Collect Fee of Position {currentPositionId}
      </button>
      <button
        className="button"
        onClick={() => {
          onMintPosition()
        }}
        disabled={
          txState === TransactionState.Sending ||
          // isLoading ||
          // isError ||
          // !isSuccess ||
          // isFetching ||
          // walletClient === undefined ||
          isDisconnected
        }>
          Mint new Position
      </button>
      <button
        className="button"
        onClick={() => {
          onRemoveLiquidity(currentPositionId)
        }}
        disabled={
          txState === TransactionState.Sending ||
          // isLoading ||
          // isError ||
          // !isSuccess ||
          // isFetching ||
          // walletClient === undefined ||
          isDisconnected
        }>
          Remove Liquidity to Position {currentPositionId}
      </button>
    </div>
  )
}