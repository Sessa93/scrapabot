import express from 'express'

import { log } from './utils'
import { run, setSchedule } from './scrapers/runner'

const router = new express.Router()

router.post('/slack/command/menu', async (req, res) => {
  try {
    const slackReqObj = req.body
    let found = run('bucatino', 'MANUAL')

    let resText = 'Working on it...'
    if (!found) {
      resText = 'No scraper found with name '+ slackReqObj.name
    }

    const response = {
      response_type: 'in_channel',
      channel: slackReqObj.channel_id,
      text: resText
    }
    return res.json(response)
  } catch (err) {
    log.error(err)
    return res.status(500).send('Something blew up! We\'re looking into it.')
  }
})

router.post('/slack/command/schedule', async (req, res) => {
  try {
    const slackReqObj = req.body
    let found = setSchedule('bucatino', slackReqObj.cron)

    let resText = 'New schedule set! '+slackReqObj.cron
    if (!found) {
      resText = 'No scraper found with name '+ slackReqObj.name
    }

    const response = {
      response_type: 'in_channel',
      channel: slackReqObj.channel_id,
      text: resText
    }
    return res.json(response)
  } catch (err) {
    log.error(err)
    return res.status(500).send('Something blew up! We\'re looking into it.')
  }
})

export default router