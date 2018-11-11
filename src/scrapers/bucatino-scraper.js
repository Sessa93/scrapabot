'use strict'

import { execSync } from 'child_process'
import fs from 'fs'
import fetch from 'node-fetch'
import { tmpdir } from 'os'
import path from 'path'
import puppeteer from 'puppeteer'
import url from 'url'

const APP_TOKEN = process.env.APP_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SLACK_URL = process.env.SLACK_URL;
const FB_USERNAME = process.env.FB_USERNAME;
const FB_PASSWORD = process.env.FB_PASSWORD;

class BucatinoScraper { 
  constructor() {
    this._name = 'bucatino'
  }
  
  get name() {
    return this._name
  }

  run = async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()

    await page.goto('https://www.facebook.com/login')
    
    const emailField = await page.$('input[name=email]')
    await emailField.click()
    await emailField.type(FB_USERNAME)
    await emailField.dispose()
    
    const passwordField = await page.$('input[name=pass]')
    await passwordField.click()
    await passwordField.type(FB_PASSWORD)
    await passwordField.dispose()
    
    const loginButton = await page.$('button[name=login]')
    await loginButton.focus()
    await loginButton.click()
    await loginButton.dispose()
    await page.waitForNavigation();
    
    const cookies = await page.cookies();
    
    await page.goto('https://www.facebook.com/pg/ilbucatinocongiardino/photos/?ref=page_internal')
    await page.waitFor('[role="presentation"] a[rel="theater"]')

    const urls = await page.$$eval('[role="presentation"] a[rel="theater"]', images =>
      images.map(img => img.getAttribute('href')),
    )

    const images = await Promise.all(
      urls.slice(0, 1 ).map(async url => {
        const urlPage = await browser.newPage()
        urlPage.setCookie(...cookies)

        await urlPage.goto(url, { timeout: 300000 })
        await urlPage.waitFor('a[rel="theater"] img')
        await urlPage.click('a[rel="theater"] img')
        await urlPage.waitFor('img.spotlight', { timeout: 300000 })
        const src = await urlPage.$eval('img.spotlight', img => img.getAttribute('src'))
        await urlPage.close()

        return src
      }),
    )

    await browser.close()

    const paths = await Promise.all(
      images.map(async image => {
        const res = await fetch(image)
        const filename = path.basename(url.parse(image).pathname)
        const filepath = path.join(tmpdir(), filename)

        fs.writeFileSync(filepath, await res.buffer())

        return filepath
      }),
    )

    for (const image of paths) {
      const parsed = path.parse(image)
      const out = path.join(parsed.dir, parsed.name)
      const outfile = `${out}.txt`

      execSync(`tesseract -l ita ${image} ${out}`, { stdio: 'ignore' })

      const content = fs.readFileSync(outfile).toString()

      fs.unlinkSync(outfile)

      if (['bucatino', 'giardino', 'menu', 'primi', 'secondi', 'pizza', 'seguici'].some(keyword => content.toLowerCase().includes(keyword))) {
        const lines = content.split('\n')
        let begin, end
        for (let i = 0; i < lines.length; i++)  {
          if (['Primi', 'abbondante'].some(keyword => lines[i].includes(keyword))) {
            begin = i
          }
          if (['Secondi', 'contorno'].some(keyword => lines[i].includes(keyword))) {
            end = i
          }
        }
        const firstCourses = lines.slice(begin, end).join('\n')

        request({
          url: SLACK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          form: { 'token': APP_TOKEN, 'channel': CHANNEL_ID, 'username': 'bucabot', 'text': firstCourses }
        },
        function (error, response, body) {
          if (!error && response.statusCode == 200) {
              console.log(body)
          }
        })
        break
      }
    }
    paths.forEach(image => fs.unlinkSync(image))
  }
}

export default BucatinoScraper;
