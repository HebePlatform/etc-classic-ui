<template>
  <div class="modal-card box box-modal">
    <header class="box-modal-header is-spaced">
      <div class="box-modal-title">{{ $t('information') }}</div>
      <button type="button" class="delete" @click="$emit('close')" />
    </header>
    <i18n path="freezeRisk" tag="div" class="note">
      <template v-slot:currency>{{ selectedCurrency }}</template>
    </i18n>
    <b-button type="is-primary is-fullwidth" @click="close">{{ $t('close') }}</b-button>
  </div>
</template>
<script>
/* eslint-disable no-console */
import { mapGetters } from 'vuex'

export default {
  components: {},
  computed: {
    ...mapGetters('application', ['selectedCurrency'])
  },
  methods: {
    close() {
      this.$parent.close()
    }
  }
}
</script>
