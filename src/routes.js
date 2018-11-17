import express from 'express'

import { log } from './utils'
import { run, setSchedule } from './scrapers/runner'

const router = new express.Router()

router.post('/slack/command/menu', async (req, res) => {
  try {
    run('bucatino')
    const slackReqObj = req.body
    const response = {
      response_type: 'in_channel',
      channel: slackReqObj.channel_id,
      text: 'Working on it...'
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
    setSchedule('bucatino', slackReqObj.cron)

    const response = {
      response_type: 'in_channel',
      channel: slackReqObj.channel_id,
      text: 'New schedule set! '+slackReqObj.cron
    }
    return res.json(response)
  } catch (err) {
    log.error(err)
    return res.status(500).send('Something blew up! We\'re looking into it.')
  }
})

export default router