import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import cors from 'cors';
import knex from 'knex';
import Clarifai from 'clarifai';

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port: 5432,
    user : 'postgres',
    password : '0001',
    database : 'smart_brain'
  }
})

// db.select('*').from('users').then(data => console.log(data));

const app = express();

// API key
const clarifai = new Clarifai.App({
 apiKey: '4028760184614db3be075e4f5057a2b6'
});

app.use(express.json());
app.use(cors());

app.get('/', (req, res) =>{
  res.json('home page') 
}) 

// handling API key
app.post('/imageurl', (req, res) => {
  clarifai.models
    .predict(
      Clarifai.FACE_DETECT_MODEL,
      req.body.inputField
    )
      .then(data => res.json(data))
      .catch(err => res.status(400).json('API does not response'))
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users')
    .where({ id })
    .increment('entries', 1)
    .returning('entries')
    .then(entry => {
      if(entry.length) {
        res.json(entry[0])
      } else {
        res.json("entry is not found")
      }
    })
    .catch(err => res.json("error getting entry"))
})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id: id})
    .then(user => {
      // console.log(user)
      if(user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('Not found')
      }
    })
    .catch(err => res.status(404).json("error getting user", err))
})

app.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json("incorrect form submission")
  }
  const hash = bcrypt.hashSync(password)
  db.transaction(trx => {
    
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loggedEmail => {
        return trx('users')
          .returning('*')
          .insert({
            name: name,
            email: loggedEmail[0],
            joined: new Date()
          })
          .then(userdata => res.json(userdata[0]))
      })
      .then(trx.commit)
      .catch(trx.rollback)
  })
  .catch(err => res.json('eeeh, u did something wrong'))
})

app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json("incorrect form submission")
  }
  db.select('*').from('login')
    .where({
      email: email
    })
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash)
      if(isValid) {
        return db.select('*').from('users')
          .where({
            email: email
          })
          .then(userdata => res.json(userdata[0]))
          .catch(err => res.status(400).json(err))
      } else {
        res.json('wrong credentials!')
      }
    })
    .catch(err => res.status(400).json('wrong credentials!'))
})

app.listen(3000, () => {
  console.log('listenning to port 3000 ...')
})