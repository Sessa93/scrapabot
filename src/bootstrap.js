import bodyParser from 'body-parser'

import { log } from './utils'
import routes from './routes'

export default function (app) {
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  // Routes
  app.use(routes)

  // 404
  app.use((req, res) => {
    let resp = {
      status: 404,
      message: 'The requested resource was not found',
    }
    console.log(resp)
    res.status(404).send(resp)
  })

  // 5xx
  app.use((err, req, res) => {
    log.error(err.stack)
    const message = process.env.NODE_ENV === 'production'
      ? 'Something blew up!, we\'re looking into it...'
      : err.stack;
    res.status(500).send({
      status: 500,
      message,
    })
  })
}