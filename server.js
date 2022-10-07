'use strict'

const { PeerRPCServer, PeerRPCClient }  = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link')

const link = new Link({
  grape: 'http://127.0.0.1:30001'
})
link.start()

const peer = new PeerRPCServer(link, {
  timeout: 300000
})

peer.init()

const peerClient = new PeerRPCClient(link, {})

peerClient.init()

const port = 1024 + Math.floor(Math.random() * 1000)
const service = peer.transport('server')
service.listen(port)

link.announce('register', service.port, {})
link.announce('update_order', service.port, {})
link.announce('sync', service.port, {})


let orderBook = {
  version: 1,
  orders: [],
  transactions: []
}

function updateOrders({order, transaction, version}) {
  if (orderBook.version === version) {
    console.log("orderBook is up to date")
  }
  else if(version === orderBook.version+1) {
    orderBook.orders.push(order)
    if(transaction) {
      orderBook.orders.transaction(transaction)
    }
    
    orderBook.version = version

    console.log(`Orderbook ${version} `, JSON.stringify(orderBook, null, 2))
  } else if (version > orderBook.version) {
    console.log("Invalid nonce to update orderBook")
  }
}

const reverseFlow = {
  buy: 'sell',
  sell: 'buy',
}

function registerOrder(order) {
  orderBook.orders.push(order);
  orderBook.version+=1;
  console.log(`New order type: ${order.type} flow: ${order.flow} id: ${order.id} orderBookVersion: ${orderBook.version}`)


  const association = orderBook.orders
  .filter(o => o.flow === reverseFlow[order.flow] && o.type === order.type)
  .find(o => !orderBook.transactions.some(t => t[reverseFlow[order.flow]] === o.id))

  let transaction
  if(association) {
    transaction = {[order.flow]: order.id, [reverseFlow[order.flow]]: association.id};
    orderBook.transactions.push(transaction)
    console.log(`New transaction :: buy ${transaction.buy} sell ${transaction.sell}`)
  }

  sendNew(order, transaction, orderBook.version)
  console.log('Orders ::: '+orderBook.orders)
}

function sendNew(order, transaction, version) {
  peerClient.request('update_order', { order, transaction, version }, { timeout: 10000 }, (err, data) => {
    if (err) {
      console.error(err)
    }
  })
}


service.on('request', (rid, key, payload, handler) => {
  if (key === "register") {
    registerOrder(payload)
    handler.reply(null, {message: "ok"})
  }

  if (key === "update_order") {
    updateOrders(payload)   
    handler.reply(null, {message: "ok"})
  }


  if (key === "sync") {
    handler.reply(null, orderBook)
  }
})



setTimeout(() => {
  console.log("Runnning....")
  
  peerClient.request('sync', {}, { timeout: 10000 }, (err, data) => {
    if (err) {
      console.error(err)
    }
    if(data) {
      console.log("Syncinnng....")
      orderBook = data;
      console.log("Order book", JSON.stringify(orderBook, null, 2))
    }
  })  
}, 1000);

process.on('SIGINT', () => {
  console.log("Exiiitt");
  link.stop();
  process.exit(0);
}); 

