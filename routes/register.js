const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-config');
const bcrypt = require('bcrypt');

router.get('/', (req, res) => {
    res.render('register', { 
        title: 'Kayıt Ol - UgandaChat',
        message: null 
    });
});
router.post('/', async(req, res) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password || !username) {
            return res.redirect('/register?error=invalid_data');
        }

        const existingUser = await db.collection('users').where('email', '==', email).get();
        if (!existingUser.empty) {
            return res.redirect('/register?error=email_exists');
        }

        const existingUsername = await db.collection('users').where('username', '==', username).get();
        if (!existingUsername.empty) {
            return res.redirect('/register?error=username_exists');
        }
        if(username.length < 3) {
            return res.redirect('/register?error=invalid_data');
        }

        if(password.length < 8) {
            return res.redirect('/register?error=invalid_data');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        


         await db.collection('users').add({
            email,
            password: hashedPassword,
            username,
            createdAt: new Date(),
            isOnline: true,
        });
        res.status(200).redirect('/login');
    } catch (error) {
        console.error('Registration error:', error);
        res.redirect('/register?error=server_error');
    }
});
module.exports = router;