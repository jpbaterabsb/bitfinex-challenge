const Link = require('grenache-nodejs-link')
const link = new Link({
    grape: 'http://127.0.0.1:30001'
  })
link.start()

link.lookup('sync',(err, data) => {
    console.log(data)
});

link.stop()