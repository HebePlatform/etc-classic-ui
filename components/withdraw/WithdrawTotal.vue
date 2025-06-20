<template>
  <div class="field">
    <div class="label">
      {{ $t('total') }}
    </div>
    <div class="withdraw-data">
      <div v-if="isTokenSelected" class="withdraw-data-item">
        {{ $t('noteBalance') }}
        <span>
          {{ selectedStatistic.amount }}
          {{ currency }}
        </span>
      </div>
      <div v-if="withdrawType === 'relayer'" class="withdraw-data-item">
        {{ $t('gasPrice') }}

        <span>{{ gasPriceInGwei }} Gwei</span>
      </div>
      <div v-if="withdrawType === 'relayer'" class="withdraw-data-item">
        {{ $t('networkFee') }}
        <span data-test="label_network_fee"
          >{{ toDecimals(withdrawalNetworkFee, 18, 6) }} {{ networkCurrency }}</span
        >
      </div>
      <div v-if="withdrawType === 'relayer'" class="withdraw-data-item">
        {{ $t('relayerFee') }}
        <span data-test="label_relayer_fee">{{ toDecimals(relayerFee, null, 6) }} {{ currency }}</span>
      </div>
      <div v-if="currency === 'ETC'" class="withdraw-data-item">
        {{ $t('poolFee') }}
        <span data-test="label_relayer_fee">{{ toDecimals(poolFee, null, 6) }} {{ currency }}</span>
      </div>
      <div v-if="withdrawType === 'relayer'" class="withdraw-data-item">
        {{ $t('totalFee') }}
        <span data-test="label_total_fee">{{ toDecimals(totalRelayerFee, null, 6) }} {{ currency }}</span>
      </div>
      <div v-if="isTokenSelected" class="withdraw-data-item">
        {{ $t('ethPurchase', { currency: networkCurrency }) }}
        <span>{{ toDecimals(ethToReceiveInToken, null, 6) }} {{ currency }}</span>
      </div>
      <hr v-if="withdrawType === 'relayer'" />
      <div class="withdraw-data-item">
        {{ $t('tokensToReceive') }}
        <span data-test="label_tokens_to_receive">{{ total }} {{ currency }}</span>
      </div>
      <div v-if="isTokenSelected" class="withdraw-data-item">
        <span class="is-alone">{{ ethToReceiveFromWei }} {{ networkCurrency }}</span>
      </div>
    </div>
  </div>
</template>
<script>
import { mapState, mapGetters } from 'vuex'
import { decimalPlaces } from '@/utils'
const { fromWei, toBN } = require('web3-utils')

export default {
  props: {
    currency: {
      type: String,
      default: 'ETH'
    },
    withdrawType: {
      type: String,
      default: 'wallet'
    },
    ethToReceive: {
      type: String,
      default: '20000000000000000'
    },
    serviceFee: {
      type: Number,
      default: null
    }
  },
  computed: {
    ...mapState('application', ['selectedStatistic']),
    ...mapState('fees', ['withdrawalNetworkFee', 'withdrawalFeeViaRelayer']),
    ...mapGetters('metamask', ['networkConfig', 'nativeCurrency']),
    ...mapGetters('metamask', {
      networkCurrency: 'currency'
    }),
    ...mapGetters('fees', ['gasPriceInGwei']),
    ...mapGetters('token', ['toDecimals', 'fromDecimals']),
    ...mapGetters('price', ['tokenRate']),
    poolFee() {
      const { amount } = this.selectedStatistic
      const total = toBN(this.fromDecimals(amount.toString()))
      const fee = 0.03
      const decimalsPoint = decimalPlaces(fee)
      const roundDecimal = 10 ** decimalsPoint
      const aroundFee = toBN(parseInt(fee * roundDecimal, 10))
      const tornadoServiceFee = total.mul(toBN(aroundFee)).div(toBN(roundDecimal * 100))
      return tornadoServiceFee
    },
    relayerFee() {
      const { amount } = this.selectedStatistic
      const total = toBN(this.fromDecimals(amount.toString()))
      const fee = this.serviceFee || this.$store.state.relayer.selectedRelayer.tornadoServiceFee
      const decimalsPoint = decimalPlaces(fee)
      const roundDecimal = 10 ** decimalsPoint
      const aroundFee = toBN(parseInt(fee * roundDecimal, 10))
      const tornadoServiceFee = total.mul(toBN(aroundFee)).div(toBN(roundDecimal * 100))
      return tornadoServiceFee
    },
    totalRelayerFee() {
      const tornadoServiceFee = this.relayerFee
      const { currency } = this.selectedStatistic
      const { decimals } = this.networkConfig.tokens[currency]
      const ethFee = this.withdrawalNetworkFee
      if (currency === this.nativeCurrency) {
        if (currency === 'etc') {
          const poolServiceFee = this.poolFee
          return ethFee.add(poolServiceFee).add(tornadoServiceFee)
        } else {
          return ethFee.add(tornadoServiceFee)
        }
      }
      const tokenFee = ethFee.mul(toBN(10 ** decimals)).div(toBN(this.tokenRate))
      return tokenFee.add(tornadoServiceFee)
    },
    isTokenSelected() {
      return (
        this.withdrawType === 'relayer' &&
        this.selectedStatistic.currency !== this.nativeCurrency &&
        this.currency !== 'TORN'
      )
    },
    ethToReceiveInToken() {
      const { currency } = this.selectedStatistic
      const { decimals } = this.networkConfig.tokens[currency]
      const price = this.tokenRate
      return toBN(this.ethToReceive)
        .mul(toBN(10 ** decimals))
        .div(toBN(price))
    },
    ethToReceiveFromWei() {
      return fromWei(this.ethToReceive)
    },
    total() {
      const { amount, currency } = this.selectedStatistic
      let total = toBN(this.fromDecimals(amount.toString()))
      if (this.withdrawType === 'relayer') {
        const totalRelayerFee = this.totalRelayerFee
        total = total.sub(totalRelayerFee)
      } else if (currency === 'etc') {
        const poolFee = this.poolFee
        total = total.sub(poolFee)
      }
      return this.toDecimals(total, null, 6)
    }
  }
}
</script>
