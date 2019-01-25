'use strict'

import BucatinoScraper from './bucatino-scraper'
import RibaltaScraper from './ribalta-scraper'
import schedule from 'node-schedule'

let jobs = {}

const MAX_RETRY = 10
const handler = {
    success: (scraper) => {
        jobs[scraper.name].failures = 0
        jobs[scraper.name].running = false
    },
    fail: (scraper) => {
        jobs[scraper.name].failures++
        if (jobs[scraper.name].failures < MAX_RETRY) {
            scraper.run()
        } else {
            jobs[scraper.name].failures = 0
            jobs[scraper.name].running = false
        }
    }
}

const scrapers = [new RibaltaScraper(handler)]


export const getScrapers = () => {
    return scrapers
}

export const setSchedule = (scraper, cronExpr) => {
    let found = false
    scrapers.forEach((s) => {
        if (s.name === scraper) {
            found = true
            if (jobs[s.name] && jobs[s.name].schedule) 
                jobs[s.name].schedule.reschedule(cronExpr, s.run.bind(null, 'SCHEDULED'))
            else {
                const job = schedule.scheduleJob(cronExpr, s.run.bind(null, 'SCHEDULED'))
                jobs[s.name] = { schedule: job, failures: 0, running: false }
            }
        }
    })
    return found
}

export const run = (scraper, mode) => {
    let found = false
    scrapers.forEach((s) => {
        if (s.name === scraper) {
            found = true
            if (!jobs[s.name]) {
                jobs[s.name] = { schedule: undefined,  failures: 0, running: true }
                s.run(mode)
            } else {
                if (!jobs[s.name].running) {
                    jobs[s.name].running = true
                    s.run(mode)
                }
            }
        }
    })
    return found
}

export const runAll = () => {
    scrapers.forEach((s) => {
        s.run()
    })
}