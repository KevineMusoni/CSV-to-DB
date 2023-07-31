const express = require('express')

const bodyParser = require('body-parser')

const csv = require('fast-csv')

const fs = require('fs')

const path = require('path')

const multer = require('multer')

const mysql = require('mysql')
const { error } = require('console')
const res = require('express/lib/response')

const app = express()

app.use(bodyParser.urlencoded({extended:false}))

app.use(bodyParser.json())

// multer config
let storage = multer.diskStorage({
    destination:(req,file,callback) => {
        callback(null, "./uploads/")
    },
    filename:(req,file,callback) =>{
        callback(null,file.fieldname + "-" + Date.now() + path.extname(file.originalname))
    }
})

let upload = multer({
    storage: storage
})
 
// connection to db
const pool = mysql.createPool({
    host:"localhost",
    user:"root",
    password:"",
    database:"exceldb"
})

app.get('/', (req,res) => {
    res.sendFile(__dirname + "/index.html")
})

app.post('/import-csv',upload.single('file'), (req,res) =>{
    console.log(req.file.path)
    uploadCsv(__dirname + "/uploads/" + req.file.filename)
})

function uploadCsv(path){
    let stream = fs.createReadStream(path)
    let csvData = []
    let fileStream = csv
        .parse()
        .on('data', function (data){
            csvData.push(data)
        })
        
        .on("end", function () {
            // Remove Header ROW
            csvData.shift();
            // Open the MySQL connection
            pool.getConnection((error,connection) => {
                if(error){
                    console.log(error)
                }
                else{
                    let query = "INSERT INTO users (Name,Email,BankID) VALUES ?"
                    connection.query(query,[csvData],(error,res) =>{
                    })
                
                }
         
            })
        })

        stream.pipe(fileStream)
}

app.listen(5000,() => {
    console.log("App is listening on port 5000")
})
