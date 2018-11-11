'use strict'

import BucatinoScraper from 'bucatino-scraper'

import schedule from 'node-schedule'

const scrapers = [BucatinoScraper]

export const getScrapers = () => {
    return scrapers
}

export const setSchedule = (scraper, cronExpr) => {
    if (scrapers.some((s) => s.name === scraper)) {
        schedule.scheduleJob(cronExpr, s.run)
    }
}

export const run = (scraper) => {
    if (scrapers.some((s) => s.name === scraper)) {
        s.run()
    }
}

export const runAll = () => {
    scrapers.forEach((s) => {
        s.run()
    })
}