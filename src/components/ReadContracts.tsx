import { useContractReads } from 'wagmi'

import { gcreContractConfig } from './contracts'
import { stringify } from '../utils/stringify'

export function ReadContracts() {
  const { data, isSuccess, isLoading } = useContractReads({
    contracts: [
      {
        ...gcreContractConfig,
        functionName: 'balanceOf',
        args: ['0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC'],
      },
      {
        ...gcreContractConfig,
        functionName: 'name',
      },
      {
        ...gcreContractConfig,
        functionName: 'totalSupply',
      },
      {
        ...gcreContractConfig,
        functionName: 'symbol'
      }
    ],
  })

  return (
    <div>
      <div>Data:</div>
      {isLoading && <div>loading...</div>}
      {isSuccess &&
        data?.map((data) => <pre key={stringify(data)}>{stringify(data)}</pre>)}
    </div>
  )
}
