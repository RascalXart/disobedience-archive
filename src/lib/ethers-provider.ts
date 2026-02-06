/** Default Ethereum RPC URL for ENS lookup etc. Override with NEXT_PUBLIC_ETH_RPC_URL if needed. */
export const DEFAULT_ETHEREUM_RPC_URL =
  process.env.NEXT_PUBLIC_ETH_RPC_URL ?? 'https://eth.llamarpc.com'
