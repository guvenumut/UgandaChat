const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-config');
const session = require('express-session');
const bcrypt = require('bcrypt');
router.get('/', (req, res) => {
    res.render('login', { 
        title: 'Giriş Yap - UgandaChat',
        message: null 
    });
});
router.post('/', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email ve şifre gerekli!' 
            });
        }
        const user = await db.collection('users').where('email', '==', email).get();
        if (user.empty) {
            return res.status(401).json({ 
                error: 'Email veya şifre hatalı!' 
            });
        }
        const userDoc = user.docs[0];
        const userData = userDoc.data();
        const isPasswordValid = await bcrypt.compare(password, userData.hashedPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                error: 'Email veya şifre hatalı!' 
            });
        }
        


        
        
        await db.collection('users').doc(userDoc.id).update({
            isOnline: true,
            lastSeen: new Date()
        });
        req.session.user = {
            id: userDoc.id,
            username: userData.username,
            email: userData.email,
            isOnline: true
        }
        res.redirect('/rooms');
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Giriş sırasında hata oluştu!' 
        });
    }
});
module.exports = router;