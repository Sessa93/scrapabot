import express from 'express'

import { log } from './utils'

const router = new express.Router()

router.post('/slack/command/menu', async (req, res) => {
  try {
    const slackReqObj = req.body
    const response = {
      response_type: 'in_channel',
      channel: slackReqObj.channel_id,
      text: 'Hello :slightly_smiling_face:',
      attachments: [{
        text: 'What menu would you like to get?',
        fallback: 'What menu would you like to get?',
        color: '#2c963f',
        attachment_type: 'default',
        callback_id: 'report_selection',
        actions: [{
          name: 'reports_select_menu',
          text: 'Choose a report...',
          type: 'select',
          options: undefined,
        }],
      }],
    }
    return res.json(response)
  } catch (err) {
    log.error(err)
    return res.status(500).send('Something blew up! We\'re looking into it.')
  }
})

export default router