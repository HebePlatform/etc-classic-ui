import { ApolloClient, InMemoryCache, gql } from '@apollo/client/core'

import {
  _META,
  GET_DEPOSITS,
  GET_STATISTIC,
  GET_REGISTERED,
  GET_WITHDRAWALS,
  GET_NOTE_ACCOUNTS,
  GET_ENCRYPTED_NOTES
} from './queries'

const isEmptyArray = (arr) => !Array.isArray(arr) || !arr.length

const first = 1000

const APIKEY_URLS = {
  1: '8b164501e1862078eff5fb9dda136c6c',
  10: 'd2db349f28c895aa2272421996404c8d',
  56: '30503850823438e04497429381e416f7',
  100: 'd2db349f28c895aa2272421996404c8d',
  137: 'd2db349f28c895aa2272421996404c8d',
  42161: 'd2db349f28c895aa2272421996404c8d',
  43114: 'd2db349f28c895aa2272421996404c8d',
  11155111: 'd2db349f28c895aa2272421996404c8d',
  88888888: 'c978a2a9a36f30ba63457b707e821e6c'
}

function getApiKey(chainId) {
  const customApiKey = window.localStorage.getItem('graphApiKey')
  if (customApiKey) {
    return customApiKey
  }
  return APIKEY_URLS[chainId]
}

const link = ({ getContext }) => {
  const { chainId } = getContext()
  return CHAIN_GRAPH_URLS[chainId].replace('{apiKey}', getApiKey(chainId))
}

const registryLink = () => {
  return CHAIN_GRAPH_URLS[88888888].replace('{apiKey}', getApiKey(88888888))
}

const CHAIN_GRAPH_URLS = {
  1: 'https://gateway.thegraph.com/api/{apiKey}/subgraphs/id/Ec6fVMDVqXTDQZ3c4jxcyV3zBXqkdgMWfhdtCgtqn7Sh',
  10: 'https://gateway.thegraph.com/api/{apiKey}/subgraphs/id/GvkbnEVhLD6KArXpEzLFtSKRmspBW29ApKFqR5FjuP2P',
  56: 'https://gateway.thegraph.com/api/{apiKey}/subgraphs/id/CiwGzefDBZCavXRPnwarnnF8xDDoLw4boBuySomJWYnV',
  100: 'https://gateway.thegraph.com/api/{apiKey}/subgraphs/id/F1m8vxuGatCBRvP8fPnnWUJ1oK7kfE1DGdRacqoamLjF',
  137: 'https://gateway.thegraph.com/api/{apiKey}/subgraphs/id/HUMgwMYNrPQpnBJgesFXyy5u6jSiJ6u5nNWQng9ayCmD',
  42161: 'https://gateway.thegraph.com/api/{apiKey}/subgraphs/id/8x8o6XFAqYZmiPwrJ51UxGTaZLYyW1fFtghvsEy7a1KJ',
  43114: 'https://gateway.thegraph.com/api/{apiKey}/subgraphs/id/CqUYVKJT9Jsyt7qnGNrf4FJNHw75ZbFGuzaJgqdaFASo',
  11155111: 'https://gateway.thegraph.com/api/{apiKey}/subgraphs/id/8kJGz92AYUm72wfyUoze1as3E11ynDSTZM8emiRWrRPy',
  88888888: 'https://gateway.thegraph.com/api/{apiKey}/subgraphs/id/DgKwfAbLfynpiq7fDJy59LDnVnia4Y5nYeRDBYi9qezc'
}

const defaultOptions = {
  query: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'all'
  }
}

const client = new ApolloClient({
  uri: link,
  credentials: 'omit',
  cache: new InMemoryCache(),
  defaultOptions
})

const registryClient = new ApolloClient({
  uri: registryLink,
  cache: new InMemoryCache(),
  credentials: 'omit',
  defaultOptions
})

async function getStatistic({ currency, amount, netId }) {
  try {
    const { data } = await client.query({
      context: {
        chainId: netId
      },
      query: gql(GET_STATISTIC),
      variables: {
        currency,
        first: 10,
        orderBy: 'index',
        orderDirection: 'desc',
        amount: String(amount)
      }
    })

    if (!data) {
      return {
        lastSyncBlock: '',
        events: []
      }
    }

    const { deposits } = data

    const lastSyncBlock = await getMeta({ netId })

    const events = deposits
      .map((e) => ({
        timestamp: e.timestamp,
        leafIndex: Number(e.index),
        blockNumber: Number(e.blockNumber)
      }))
      .reverse()

    const [lastEvent] = events.slice(-1)

    return {
      lastSyncBlock: lastEvent?.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock,
      events
    }
  } catch {
    return {
      lastSyncBlock: '',
      events: []
    }
  }
}

async function getAllRegisters(fromBlock) {
  try {
    const relayers = await getRegisters(fromBlock)

    if (!relayers) {
      return { lastSyncBlock: '', events: [] }
    }

    const lastSyncBlock = await getRegisteredMeta()

    return { lastSyncBlock, events: relayers }
  } catch {
    return { lastSyncBlock: '', events: [] }
  }
}
async function getAllDeposits({ currency, amount, fromBlock, netId }) {
  try {
    let deposits = []

    while (true) {
      let result = await getDeposits({ currency, amount, fromBlock, netId })

      if (isEmptyArray(result)) {
        break
      }

      if (result.length < 900) {
        deposits = deposits.concat(result)
        break
      }

      const [lastEvent] = result.slice(-1)

      result = result.filter((e) => e.blockNumber !== lastEvent.blockNumber)
      fromBlock = Number(lastEvent.blockNumber)

      deposits = deposits.concat(result)
    }

    if (!deposits) {
      return {
        lastSyncBlock: '',
        events: []
      }
    }

    const lastSyncBlock = await getMeta({ netId })

    const data = deposits.map((e) => ({
      timestamp: e.timestamp,
      commitment: e.commitment,
      leafIndex: Number(e.index),
      blockNumber: Number(e.blockNumber),
      transactionHash: e.transactionHash
    }))

    const [lastEvent] = data.slice(-1)

    return {
      events: data,
      lastSyncBlock: lastEvent?.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock
    }
  } catch {
    return {
      lastSyncBlock: '',
      events: []
    }
  }
}

async function getMeta({ netId }) {
  try {
    const { data } = await client.query({
      context: {
        chainId: netId
      },
      query: gql(_META)
    })

    if (!data) {
      return undefined
    }

    return data._meta.block.number
  } catch {
    return undefined
  }
}

async function getRegisteredMeta() {
  try {
    const { data } = await registryClient.query({
      context: {
        chainId: 1
      },
      query: gql(_META)
    })

    if (!data) {
      return undefined
    }

    return data._meta.block.number
  } catch {
    return undefined
  }
}

async function getRegisters(fromBlock) {
  const { data } = await registryClient.query({
    context: {
      chainId: 1
    },
    query: gql(GET_REGISTERED),
    variables: { first, fromBlock }
  })

  if (!data) {
    return []
  }

  return data.relayers
}

async function getDeposits({ currency, amount, fromBlock, netId }) {
  const { data } = await client.query({
    context: {
      chainId: netId
    },
    query: gql(GET_DEPOSITS),
    variables: { currency, amount: String(amount), first, fromBlock }
  })

  if (!data) {
    return []
  }

  return data.deposits
}

async function getAllWithdrawals({ currency, amount, fromBlock, netId }) {
  try {
    let withdrawals = []

    while (true) {
      let result = await getWithdrawals({ currency, amount, fromBlock, netId })

      if (isEmptyArray(result)) {
        break
      }

      if (result.length < 900) {
        withdrawals = withdrawals.concat(result)
        break
      }

      const [lastEvent] = result.slice(-1)

      result = result.filter((e) => e.blockNumber !== lastEvent.blockNumber)
      fromBlock = Number(lastEvent.blockNumber)

      withdrawals = withdrawals.concat(result)
    }

    if (!withdrawals) {
      return {
        lastSyncBlock: '',
        events: []
      }
    }

    const lastSyncBlock = await getMeta({ netId })

    const data = withdrawals.map((e) => ({
      to: e.to,
      fee: e.fee,
      timestamp: e.timestamp,
      nullifierHash: e.nullifier,
      blockNumber: Number(e.blockNumber),
      transactionHash: e.transactionHash
    }))

    const [lastEvent] = data.slice(-1)

    return {
      events: data,
      lastSyncBlock: lastEvent?.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock
    }
  } catch {
    return {
      lastSyncBlock: '',
      events: []
    }
  }
}

async function getWithdrawals({ currency, amount, fromBlock, netId }) {
  const { data } = await client.query({
    context: {
      chainId: netId
    },
    query: gql(GET_WITHDRAWALS),
    variables: { currency, amount: String(amount), fromBlock, first }
  })

  if (!data) {
    return []
  }

  return data.withdrawals
}

async function getNoteAccounts({ address, netId }) {
  try {
    const { data } = await client.query({
      context: {
        chainId: netId
      },
      query: gql(GET_NOTE_ACCOUNTS),
      variables: { address }
    })

    if (!data) {
      return {
        lastSyncBlock: '',
        events: []
      }
    }

    const lastSyncBlock = await getMeta({ netId })

    return {
      lastSyncBlock,
      events: data.noteAccounts
    }
  } catch {
    return {
      lastSyncBlock: '',
      events: []
    }
  }
}

async function getAllEncryptedNotes({ fromBlock, netId }) {
  try {
    let encryptedNotes = []

    while (true) {
      let result = await getEncryptedNotes({ fromBlock, netId })

      if (isEmptyArray(result)) {
        break
      }

      if (result.length < 900) {
        encryptedNotes = encryptedNotes.concat(result)
        break
      }

      const [lastEvent] = result.slice(-1)

      result = result.filter((e) => e.blockNumber !== lastEvent.blockNumber)
      fromBlock = Number(lastEvent.blockNumber)

      encryptedNotes = encryptedNotes.concat(result)

      if (isEmptyArray(result)) {
        break
      }
    }

    if (!encryptedNotes) {
      return {
        lastSyncBlock: '',
        events: []
      }
    }

    const lastSyncBlock = await getMeta({ netId })

    const data = encryptedNotes.map((e) => ({
      txHash: e.transactionHash,
      encryptedNote: e.encryptedNote,
      transactionHash: e.transactionHash,
      blockNumber: Number(e.blockNumber)
    }))

    const [lastEvent] = data.slice(-1)

    return {
      events: data,
      lastSyncBlock: lastEvent?.blockNumber >= lastSyncBlock ? lastEvent.blockNumber + 1 : lastSyncBlock
    }
  } catch {
    return {
      lastSyncBlock: '',
      events: []
    }
  }
}

async function getEncryptedNotes({ fromBlock, netId }) {
  const { data } = await client.query({
    context: {
      chainId: netId
    },
    query: gql(GET_ENCRYPTED_NOTES),
    variables: { fromBlock, first }
  })

  if (!data) {
    return []
  }

  return data.encryptedNotes
}

export default {
  getDeposits,
  getStatistic,
  getAllDeposits,
  getWithdrawals,
  getNoteAccounts,
  getAllRegisters,
  getAllWithdrawals,
  getAllEncryptedNotes
}
