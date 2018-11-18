'use strict'

import BucatinoScraper from './bucatino-scraper'
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

const scrapers = [new BucatinoScraper(handler)]

export const getScrapers = () => {
    return scrapers
}

export const setSchedule = (scraper, cronExpr) => {
    scrapers.forEach((s) => {
        if (s.name === scraper) {
            if (jobs[s.name] && jobs[s.name].schedule) 
                jobs[s.name].schedule.reschedule(cronExpr, s.run)
            else {
                const job = schedule.scheduleJob(cronExpr, s.run)
                jobs[s.name] = { schedule: job, failures: 0, running: false }
            }
        }
    })
}

export const run = (scraper) => {
    scrapers.forEach((s) => {
        if (s.name === scraper) {
            if (!jobs[s.name]) {
                jobs[s.name] = { schedule: undefined,  failures: 0, running: true }
                s.run()
            } else {
                if (!jobs[s.name].running) {
                    jobs[s.name].running = true
                    s.run()
                }
            }
        }
    })
}

export const runAll = () => {
    scrapers.forEach((s) => {
        s.run()
    })
}