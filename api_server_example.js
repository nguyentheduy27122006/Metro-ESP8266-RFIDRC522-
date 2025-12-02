// api_server_example.js
// Simple Express API that forwards to Firebase Realtime Database via REST.
// Use: npm install express node-fetch dotenv body-parser
const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const FIREBASE_DB = process.env.FIREBASE_DB_URL; // e.g. https://...firebaseio.com
const FIREBASE_SECRET = process.env.FIREBASE_SECRET || ''; // if required

function fbUrl(path){
  return `${FIREBASE_DB}/${path}.json${FIREBASE_SECRET?('?auth='+FIREBASE_SECRET):''}`;
}

app.post('/api/transaction', async (req, res) => {
  const { uid, station, timestamp, fare, status } = req.body;
  if(!uid || !station) return res.status(400).json({error:'uid and station required'});
  const payload = {
    uid, station_in: station, station_out:'', timestamp: timestamp || Math.floor(Date.now()/1000),
    fare: fare || 0, status: status || 'IN'
  };
  try{
    const r = await fetch(fbUrl('metro/transactions'), {method:'POST', body: JSON.stringify(payload), headers:{'Content-Type':'application/json'}});
    const data = await r.json();
    return res.json({ok:true, id: data.name});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:'failed'});
  }
});

app.get('/api/cards/:uid', async (req,res)=>{
  const uid = req.params.uid;
  try{
    const r = await fetch(fbUrl('metro/cards/' + uid));
    const data = await r.json();
    res.json(data||{});
  }catch(e){ res.status(500).json({error:'fetch failed'}); }
});

app.post('/api/cards/:uid/topup', async (req,res)=>{
  const uid = req.params.uid;
  const amount = Number(req.body.amount||0);
  if(amount<=0) return res.status(400).json({error:'invalid amount'});
  try{
    const r1 = await fetch(fbUrl('metro/cards/' + uid));
    const card = await r1.json() || {balance:0};
    card.balance = Number(card.balance||0) + amount;
    card.last_topup = Math.floor(Date.now()/1000);
    await fetch(fbUrl('metro/cards/' + uid), {method:'PUT', body: JSON.stringify(card), headers:{'Content-Type':'application/json'}});
    res.json({ok:true, balance:card.balance});
  }catch(e){ res.status(500).json({error:'failed'}); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('API listening', PORT));
