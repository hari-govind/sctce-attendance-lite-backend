var express = require('express')
var bodyParser = require('body-parser')
var app = express()
var dataProcessor = require('./dataProcessor.js');

app.use(bodyParser.urlencoded({extended: false}))

app.post('/login', (req,res)=> {
    console.log(req.body)
    dataProcessor.isValidLogin(req.body.username,req.body.password)
        .then((result)=>{
            console.log(result)
            res.set({'Access-Control-Allow-Origin': '*'})
            res.send(result);
        })
})

app.listen(8080)