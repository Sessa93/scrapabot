const puppeteer = require('puppeteer')

const run = async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto('https://www.facebook.com/pg/ilbucatinocongiardino/photos/?ref=page_internal')
  await page.waitFor('[role="presentation"] a[rel="theater"]')

  const urls = await page.$$eval('[role="presentation"] a[rel="theater"]', images =>
    images.map(img => img.getAttribute('href')),
  )

  const images = await Promise.all(
    urls.slice(0, 5).map(async url => {
      const urlPage = await browser.newPage()
      await urlPage.goto(url)
      await urlPage.waitFor('a[rel="theater"] img')
      const src = await urlPage.$eval('a[rel="theater"] img', img => img.getAttribute('src'))

      await urlPage.close()

      return src
    }),
  )
  console.log(images.join('\n'))

  await browser.close()
}

run()
