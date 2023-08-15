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

function uploadCsv(path, selectedTable, callback) {
    let stream = fs.createReadStream(path);
    let csvData = [];
    let fileStream = csv
        .parse()
        .on('data', function (data) {
            csvData.push(data);
        })
        .on("end", function () {
            // Remove Header ROW
            csvData.shift();

            pool.getConnection((error, connection) => {
                if (error) {
                    console.log(error);
                    callback(error, false);
                } else {
                    let columns;
                    if (selectedTable === "data1") {
                        columns = "Name, Email, BankID";
                    } else if (selectedTable === "sampledata") {
                        columns = "BankID, Transaction";
                    }

                    let query = `INSERT INTO ${selectedTable} (${columns}) VALUES ?`;
                    connection.query(query, [csvData], (error, result) => {
                        if (error) {
                            console.log("Error executing MySQL query:", error);
                            callback(error, false);
                        } else {
                            console.log("CSV data inserted successfully!");
                            callback(null, true);
                        }
                        connection.release();
                    });
                }
            });
        });

    stream.pipe(fileStream);
}


app.post('/import-csv', upload.single('file'), (req, res) => {
    const selectedTable = req.query.table; // Get the selected table from query parameter

    if (selectedTable === "data1" || selectedTable === "sampledata") {
        const filePath = path.join(__dirname, "uploads", req.file.filename);
        uploadCsv(filePath, selectedTable, (error, success) => {
            if (error) {
                console.log("Error importing records:", error);
                res.status(500).json({ message: "Error importing records" });
            } else if (success) {
                console.log("CSV data inserted successfully!");
                res.status(200).json({ message: "Upload successful" });
            } else {
                console.log("Upload failed");
                res.status(500).json({ message: "Upload failed" });
            }
        });
    } else {
        res.status(400).json({ message: "Invalid table selected" });
    }
});


app.post('/login', (req, res) => {
    const { userId, password } = req.body;

    // Query the database to verify user credentials
    const query = "SELECT * FROM exceldbdusers WHERE userId = ? AND password = ?";
    pool.query(query, [userId, password], (error, results) => {
        if (error) {
            console.log("Error executing MySQL query:", error);
            res.status(500).json({ message: "Error verifying credentials" });
        } else {
            if (results.length === 1) {
                res.json({ message: "Login successful" });
            } else {
                res.status(401).json({ message: "Invalid credentials" });
            }
        }
    });
});


app.listen(5000,() => {
    console.log("App is listening on port 5000")
})
