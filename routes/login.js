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
            return res.render('login', { 
                title: 'Giriş Yap - UgandaChat',
                message: 'Email ve şifre gerekli!' 
            });
        }
        
        const user = await db.collection('users').where('email', '==', email).get();
        if (user.empty) {
            return res.render('login', { 
                title: 'Giriş Yap - UgandaChat',
                message: 'Email veya şifre hatalı!' 
            });
        }
        const userDoc = user.docs[0];
        const userData = userDoc.data();
        
        if (userData.authProvider && userData.authProvider === 'google') {
            return res.render('login', { 
                title: 'Giriş Yap - UgandaChat',
                message: 'Bu hesap Google ile oluşturulmuş. Lütfen "Google ile devam et" butonunu kullanın.' 
            });
        }
        
        if (!userData.password) {
            return res.render('login', { 
                title: 'Giriş Yap - UgandaChat',
                message: 'Email veya şifre hatalı!' 
            });
        }
        
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        
        if (!isPasswordValid) {
            return res.render('login', { 
                title: 'Giriş Yap - UgandaChat',
                message: 'Email veya şifre hatalı!' 
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
        res.render('login', { 
            title: 'Giriş Yap - UgandaChat',
            message: 'Giriş sırasında hata oluştu!' 
        });
    }
});
module.exports = router;