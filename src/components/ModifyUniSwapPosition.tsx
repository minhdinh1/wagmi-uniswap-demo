import { useCallback, useState } from "react"
import { useEthersProvider, useEthersSigner } from "../ethers"
import { erc20ABI, useAccount, useWalletClient } from "wagmi"
import { ethers } from "ethers"
import { FeeAmount, NonfungiblePositionManager, Pool, Position, computePoolAddress } from "@uniswap/v3-sdk"
import { PrepareTransactionRequestReturnType, createWalletClient, fromHex, getAddress, parseEther, parseUnits } from "viem"
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { ChainId, CurrencyAmount, Percent, Token } from "@uniswap/sdk-core"
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

  const sendTransactionSigner = async (transaction: ethers.providers.TransactionRequest): Promise<TransactionState> => {
    if (!signer) {
      console.error('signer is not initialized')
      return TransactionState.Failed
    }
    const txRes = await signer.sendTransaction(transaction)
    console.log(txRes)
    let receipt = null

    while (receipt === null) {
      try {
        receipt = await provider.getTransactionReceipt(txRes!.hash)

        if (receipt === null) {
          continue
        }
      } catch (e) {
        console.error(`Receipt error:`, e)
        break
      }
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
    amountToApprove: CurrencyAmount<Token>
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
  
      return sendTransactionSigner({
        ...transaction,
        from: address,
      })
    } catch (e) {
      console.error(e)
      return TransactionState.Failed
    }
  }

  const addLiquidity = async (positionId: number) => {
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

    const poolInstance = new Pool(
      token0Instance,
      token1Instance,
      FeeAmount.MEDIUM,
      slot0[0].toString(),
      liquidity.toString(),
      slot0[1]
    )

    const positionContract = new ethers.Contract(
      NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
      NONFUNGIBLE_POSITION_MANAGER_ABI,
      provider
    )

    const position = await positionContract.positions(positionId)
    const currentPosition = new Position({
      pool: poolInstance,
      liquidity: position.liquidity.toString(),
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
    })

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
      modifiedPosition.amount0,
    )
    const tokenOutApproval = await getTokenTransferApproval(
      token1Instance,
      modifiedPosition.amount1
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
    return sendTransactionSigner(transaction)

    // return TransactionState.Sent
  }

  const onAddLiquidity = useCallback(async (positionId: number) => {
    setTxState(TransactionState.Sending)
    setTxState(await addLiquidity(positionId))
  }, [signer])

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
    </div>
  )
}