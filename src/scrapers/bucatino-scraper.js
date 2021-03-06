'use strict'

import { execSync } from 'child_process'
import fs from 'fs'
import fetch from 'node-fetch'
import { tmpdir } from 'os'
import path from 'path'
import puppeteer from 'puppeteer'
import url from 'url'
import config from 'config'
import request from 'request'

const APP_TOKEN = config.get('slack.bucabot.appToken')
const CHANNEL_ID = config.get('slack.bucabot.channel')
const SLACK_URL = config.get('slack.bucabot.api')
const FB_USERNAME = config.get('slack.bucabot.facebook.username');
const FB_PASSWORD = config.get('slack.bucabot.facebook.password')

export default class BucatinoScraper { 
  constructor(runner) {
    this._name = 'bucatino'
    this._runner = runner
  }
  
  get name() {
    return this._name
  }

  makeRequest(text) {
    request({
      url: SLACK_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      form: { 'token': APP_TOKEN, 'channel': CHANNEL_ID, 'username': 'bucabot', text }
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
          console.log(body)
      }
    })
  }

  async run(mode) {
    console.log(this._name + ' is scraping...')
    try {
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true })
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
          await urlPage.waitFor('#fbPhotoSnowliftTimestamp > a > abbr', { timeout: 300000 })
          
          const src = await urlPage.$eval('img.spotlight', img => img.getAttribute('src'))
          const date = new Date((await urlPage.$eval('#fbPhotoSnowliftTimestamp > a > abbr', abbr => abbr.getAttribute('data-utime')))*1000)
          console.log(date)

          await urlPage.close()

          return { src, date } 
        }),
      )

      await browser.close()

      const paths = await Promise.all(
        images.map(async (obj) => {
          const res = await fetch(obj.src)
          const filename = path.basename(url.parse(obj.src).pathname)
          const filepath = path.join(tmpdir(), filename)

          fs.writeFileSync(filepath, await res.buffer())
          const date = obj.date
          return { image: filepath, date }
        }),
      )

      for (const obj of paths) {
        const parsed = path.parse(obj.image)
        const out = path.join(parsed.dir, parsed.name)
        const outfile = `${out}.txt`

        const diff = (new Date()) - obj.date
        console.log('DIFF '+diff)
        if (mode === 'SCHEDULED' && Math.floor((diff % 86400000) / 3600000) > 3) {
          request({
            url: SLACK_URL,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            form: { 'token': APP_TOKEN, 'channel': CHANNEL_ID, 'username': 'bucabot', text: "Sorry! Last Bucatino's menu was published " + date.toISOString() + ". You can try again later with /menu" }
          },
          function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body)
            }
          })
          break
        }

        execSync(`tesseract -l ita ${obj.image} ${out}`, { stdio: 'ignore' })
        console.log('OCR: DONE!')

        const content = fs.readFileSync(outfile).toString()
        fs.unlinkSync(outfile)

        let amatriciana = false
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
            if(lines[i].includes('amatriciana')) {
              amatriciana = true
            }
          }
          let firstCourses = lines.slice(begin, end).join('\n')

          if (amatriciana) {
            firstCourses += '\n@gnardiello !AMATRICIANA!'
          }

          request({
            url: SLACK_URL,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            form: { 'token': APP_TOKEN, 'channel': CHANNEL_ID, 'username': 'bucabot', text: firstCourses }
          },
          function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body)
            }
          })
          break
        }
      }
      paths.forEach(imgObj => fs.unlinkSync(imgObj.image))
      this._runner.success(this)
    } catch(exception) {
      console.log(exception)
      this._runner.fail(this)
    }
  }
}