const { execSync } = require('child_process')
const fs = require('fs')
const fetch = require('node-fetch')
const { tmpdir } = require('os')
const path = require('path')
const puppeteer = require('puppeteer')
const url = require('url')
const request = require('request')

const APP_TOKEN = process.env.APP_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SLACK_URL = process.env.SLACK_URL;

const run = async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.goto('https://www.facebook.com/pg/ilbucatinocongiardino/photos/?ref=page_internal')
  await page.waitFor('[role="presentation"] a[rel="theater"]')

  const urls = await page.$$eval('[role="presentation"] a[rel="theater"]', images =>
    images.map(img => img.getAttribute('href')),
  )

  const images = await Promise.all(
    urls.slice(0, 5).map(async url => {
      const urlPage = await browser.newPage()
      await urlPage.goto(url, { timeout: 300000 })
      await urlPage.waitFor('a[rel="theater"] img')
      await urlPage.click('a[rel="theater"] img')
      await urlPage.waitFor('img.spotlight')
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
          console.log('End: '+lines[i])
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

run()

process.on('unhandledRejection', err => {
  console.error(err)

  process.exit(1)
})

process.on('unhandledPromiseRejection', err => {
  console.error(err)

  process.exit(1)
})
