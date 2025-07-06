const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-config');
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
            return res.status(400).json({ 
                error: 'Email, password ve username gerekli!' 
            });
        }
         await db.collection('users').add({
            email,
            password,
            username,
            createdAt: new Date(),
            isOnline: true,
        });
        res.status(200).json({ 
            message: 'User registered successfully',
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Kullanıcı kaydı sırasında hata oluştu!' 
        });
    }
});
module.exports = router;