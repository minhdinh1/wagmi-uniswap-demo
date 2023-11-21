import { useEffect, useState } from "react"
import { getContract } from "viem"
import { usePublicClient } from "wagmi"
import { gcreContractConfig } from "./contracts"

interface GcreData {
  name: string,
  totalSupply: bigint,
  symbol: string
}

export const GetContractReads = () => {
  const publicClient = usePublicClient()
  const [gcreData, setGcreData] = useState<GcreData>()

  useEffect(() => {
    const fetchGcreData = async () => {
      const gcreContract = getContract({...gcreContractConfig, publicClient,})

      const [name, totalSupply, symbol] = await Promise.all([
        gcreContract.read.name(),
        gcreContract.read.totalSupply(),
        gcreContract.read.symbol(),
      ])

      console.log(name)
      console.log(totalSupply)
      console.log(symbol)

      setGcreData({
        name: name,
        totalSupply: totalSupply,
        symbol: symbol
      })
    }

    fetchGcreData()
      .catch(console.error)
  }, [])

  return (
    <div>
      <div>GcreData:</div>
      <div>Name: {gcreData?.name}</div>
      <div>TotalSupply: {gcreData?.totalSupply.toString()}</div>
      <div>Symbol: {gcreData?.symbol}</div>
    </div>
  )
}