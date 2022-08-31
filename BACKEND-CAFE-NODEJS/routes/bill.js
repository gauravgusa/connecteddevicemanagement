const express = require("express");
const connection = require("../connection");
const router = express.Router();
let ejs = require("ejs")
let pdf = require("html-pdf")
let path = require("path")
let fs = require("fs")
let uuid = require("uuid")

var auth = require('../services/authentication');
const { connect } = require("../connection");

//to generate the report

router.post('/generateReport', auth.authenticateToken, (req, res) => {
    const generateUuid = uuid.v1(); // this one is timebased
    const orderDetails = req.body;
    console.log(orderDetails.productDetails);

    //var productDetailsReport = orderDetails.productDetails;
    var productDetailsReport = JSON.parse(orderDetails.productDetails).utf;
    //above is to remove / from input
    //console.log(productDetailsReport);
    //store this data in db

    var query = "insert into bill (name, uuid, email, contactNumber, paymentMethod, total, productDetails, createdBy) values (?,?,?,?,?,?,?,?)"
    connection.query(query, [orderDetails.name, generateUuid, orderDetails.email, orderDetails.contactNumber, orderDetails.paymentMethod, orderDetails.totalAmount, orderDetails.productDetails, res.locals.email], (err, results) => {
        if (!err) {
            console.log("no error ..")

            //pass all the details in this file
            ejs.renderFile(path.join(__dirname, '', "report.ejs"), { productDetails: JSON.parse(orderDetails.productDetails), name: orderDetails.name, email: orderDetails.email, contactNumber: orderDetails.contactNumber, paymentMethod: orderDetails.paymentMethod, totalAmount: orderDetails.totalAmount }, (err, results) => {
                if (err) {
                    return res.status(500).json(err)
                }
                else {
                    //console.log("ready to create pdf")
                    //console.log(results)
                    pdf.create(results).toFile('./generated_pdf/' + generateUuid + ".pdf", function (err, data) {
                        if (err) {
                            console.log(err)
                            return res.status(500).json(err)
                        }
                        else {
                            console.log(generateUuid);
                            return res.status(200).json({ uuid: generateUuid })
                        }
                    })
                }
            })
        }
        else {
            return res.status(500).json(err)
        }
    })
})

router.post('/getPdf', auth.authenticateToken, function (req, res) {
    const orderDetails = req.body
    const pdfPath = './generated_pdf/' + orderDetails.uuid + '.pdf'
    if (fs.existsSync(pdfPath)) {
        res.contentType("application/pdf")
        fs.createReadStream(pdfPath).pipe(res);
    }
    else {
        var productDetailsReport = JSON.parse(orderDetails.productDetails)
        //pass all the details in this file
        ejs.renderFile(path.join(__dirname, '', "report.ejs"), { productDetails: JSON.parse(orderDetails.productDetails), name: orderDetails.name, email: orderDetails.email, contactNumber: orderDetails.contactNumber, paymentMethod: orderDetails.paymentMethod, totalAmount: orderDetails.totalAmount }, (err, results) => {
            if (err) {
                return res.status(500).json(err)
            }
            else {
                //console.log("ready to create pdf")
                //console.log(results)
                pdf.create(results).toFile('./generated_pdf/' + orderDetails.uuid + ".pdf", function (err, data) {
                    if (err) {
                        console.log(err)
                        return res.status(500).json(err)
                    }
                    else {
                        res.contentType("application/pdf")
                        fs.createReadStream(pdfPath).pipe(res);
                    }
                })
            }
        })
    }


})

router.get('/getBills', auth.authenticateToken, function (req, res, next) {
    var query = "select * from bill order by id DESC"
    connection.query(query, (err, results) => {
        if (!err) {
            return res.status(200).json(results)
        }
        else {
            return res.status(500).json(err)
        }
    })
})

router.delete('/delete/:id', auth.authenticateToken, function (req, res, next) {
    const id = req.params.id
    var query = "delete from bill where id = ?"
    connection.query(query, [id], (err, results) => {
        if (!err) {
            //check if any row is updated 
            if (results.affectedRows == 0) {
                // this means id given was incorrect
                return res.status(404).json({ message: "Bill id does not found" });
            }
            return res.status(200).json({ message: "Bill Deleted Successfully" });
        }
        else {
            return res.status(500).json(err);
        }
    })
})

module.exports = router;