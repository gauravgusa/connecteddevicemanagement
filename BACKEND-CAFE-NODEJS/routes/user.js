const express = require("express");
const connection = require("../connection");
const router = express.Router();

const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

require('dotenv').config();

var auth = require('../services/authentication');
var checkRole = require('../services/checkRole');

//next we will write api
router.post("/signup", (req, res) => {
  let user = req.body;
  console.log(user);
  query = "select email, password, role, status from user where email = ?";
  connection.query(query, [user.email], (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        query =
          "insert into user(name, contactNumber, email, password, status, role) values (?,?,?,?,'false','user')";
        connection.query(
          query,
          [user.name, user.contactNumber, user.email, user.password],
          (err, results) => {
            if (!err) {
              return res
                .status(200)
                .json({ message: "Successfully Registered" });
            } else {
              return res.status(500).json(err);
            }
          }
        );
      } else {
        return res.status(400).json({ message: "Email Already Exist." });
      }
    } else {
      return res.status(500).json(err);
    }
  });
});

//implement login api
router.post("/login", (req, res) => {
  const user = req.body;

  query = "select email, password, role, status from user where email = ?";
  connection.query(query, [user.email], (err, results) => {
    if (!err) {
      if (results.length <= 0 || results[0].passsword != user.passsword) {
        return res.status(401).json({ message: "Incorrect UserName or Password" });
      }
      else if (results[0].status === 'false') {
        //means he need admin approval
        return res.status(401).json({ message: "Wait for Admin Approval" });
      }
      else if (results[0].password == user.password) {
        //generate json token 
        const response = { email: results[0].email, role: results[0].role };

        // create obj with email and role , will pass this in jwt sign, this will 
        // also need access token one we have genereatd and expiry time
        const accessToken = jwt.sign(response, process.env.ACCESS_TOKEN, { expiresIn: '8h' });

        return res.status(200).json({ token: accessToken });
      }
      else {
        return res.status(400).json({ message: "Something went wrong, Please try again later" });
      }
    }
    else {
      return res.status(500).json(err);
    }
  })

})


var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD
  }
})

router.post('/forgetpassword', (req, res) => {
  const user = req.body;
  query = "select email, password from user where email = ?";

  connection.query(query, [user.email], (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        // prevent hackers to know if user exist
        return res.status(200).json({ message: "Password send successfully to your email" });
      }
      else {
        var mailOptions = {
          from: process.env.EMAIL,
          to: results[0].email,
          subject: 'Password by Cafe Management Sytem',
          html: '<p><b> Your login details for Cafe Management System  </b><br><b>Email: </b>' + results[0].email + '<br><b>Password: </b>' + results[0].password + '<br><a href="http://localhost:4200/">Click here to login</a> </p>'
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          }
          else {
            //what ever response we get we are going to print that
            console.log('Email sent: ' + info.response)
          }
        });
        //return following message to the user
        return res.status(200).json({ message: "Password send successfully to your email" });
      }

    }
    else {
      return res.status(500).json(err);
    }
  })

})

//get all users
router.get('/get', auth.authenticateToken, (req, res) => {
  var query = "select id, name, email, contactNumber, status from user where role='user' ";
  connection.query(query, (err, results) => {
    if (!err) {
      return res.status(200).json(results);
    }
    else {
      return res.status(500).json(err);
    }
  })
})

//change the status of user
router.patch('/update', auth.authenticateToken, checkRole.checkRole, (req, res) => {
  let user = req.body;
  console.log(user);
  var query = "update user set status = ? where id = ?";
  connection.query(query, [user.status, user.id], (err, results) => {
    if (!err) {
      //if above query was successful then affectedRows will be 1
      if (results.affectedRows == 0) {
        // 0 means not updated 
        return res.status(401).json({ message: "UserId does not exist" });
      }
      return res.status(200).json({ message: "User updated successfully" });

    }
    else {
      return res.status(500).json(err);
    }
  })
})

//create another api to check the token
router.get('/checkToken', auth.authenticateToken, checkRole.checkRole, (req, res) => {
  return res.status(200).json({ message: "true" });
})

// change password
router.patch('/changePassword', auth.authenticateToken, (req, res) => {
  const user = req.body;
  const email = res.locals.email;
  console.log(email);
  console.log(user);
  //we are going to get email from token
  var query = "select * from user where email = ? and password = ?";
  connection.query(query, [email, user.oldPassword], (err, results) => {
    if (!err) {
      //move farword
      if (results.length <= 0) {
        return res.status(400).json({ message: "Incorrect Old Password" });
      } else if (results[0].password == user.oldPassword) {
        query = "update user set password=? where email = ?";
        connection.query(query, [user.newPassword, email], (err, results) => {
          if (!err) {
            return res.status(200).json({ message: "Password Updated Successfully." })
          }
          else {
            return res.status(500).json(err);
          }
        })
      } else {
        return res.status(400).json({ message: "Something went wrong. Please try again later" });
      }

    } else { return res.status(500).json(err) }
  })
})


module.exports = router;
