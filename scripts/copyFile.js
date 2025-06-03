import { argv } from 'process'
import { copyFile } from 'fs'

function copyFiles() {
  const [, , inFile, outFile] = argv

  copyFile(inFile, outFile, function(err) {
    if (err) {
      throw err
    }

    console.log(`Copied ${inFile} to ${outFile}`)
  })
}
copyFiles()
