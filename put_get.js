'use strict'

const Link = require('grenache-nodejs-link')

const link = new Link({
  grape: 'http://127.0.0.1:30001'
})
link.start()

setInterval(() => {
  link.put({ v: 'hello world' }, (err, hash) => {
    console.log('data saved to the DHT', err, hash)

    var crypto = require('crypto')
    var shasum = crypto.createHash('sha1')
    console.log(shasum.update(`put:${JSON.stringify({ v: 'hello world' })}`).digest('hex'))
  })
}, 2000)