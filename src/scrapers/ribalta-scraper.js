import request from 'request'
import config from 'config'
import fetch from 'node-fetch'
import path from 'path'
import url from 'url'
import { tmpdir } from 'os'
import fs from 'fs'

const RIBALTA_URL = config.get('slack.ribalta.url')

export default class RibaltaScraper { 
    constructor(runner) {
      this._name = 'ribalta'
      this._runner = runner
    }
    
    get name() {
      return this._name
    }

    async run() {
        try {
            const res = await fetch(RIBALTA_URL)
            const filename = path.basename(url.parse(RIBALTA_URL).pathname)
            const filepath = path.join(tmpdir(), filename)

            fs.writeFileSync(filepath, await res.buffer())

            console.log(filepath)

            this._runner.success(this)
        } catch (exception) {
            console.log(exception)
            this._runner.fail(this)
        }
    }
}