/**
 * Manually patch vuex to support Node.js >= 18.x
 * 
 * See issue https://github.com/vuejs/vuex/issues/2160
 * https://github.com/vuejs/vuex/commit/397e9fba45c8b4ec0c4a33d2578e34829bd348d7
 */
const fs = require('fs')

const pkgJson = JSON.parse(fs.readFileSync('./node_modules/vuex/package.json', { encoding: 'utf8' }))
const backupJson = JSON.stringify(pkgJson, null, 2)

let changes = false

if (!pkgJson.exports['./*']) {
  pkgJson.exports['./*'] = './*'

  changes = true
}


if (changes) {
  fs.writeFileSync('./node_modules/vuex/package.backup.json', backupJson + '\n')
  fs.writeFileSync('./node_modules/vuex/package.json', JSON.stringify(pkgJson, null, 2) + '\n')
}
