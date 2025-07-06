const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-config');
router.get('/', async (req, res) => {
    try {
        if (req.session.user) {
            await db.collection('users').doc(req.session.user.id).update({
                isOnline: false,
                lastSeen: new Date()
            });
            console.log(`User logged out: ${req.session.user.username}`);
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.status(500).json({ 
                    error: 'Çıkış işlemi sırasında hata oluştu!' 
                });
            }
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            error: 'Çıkış işlemi sırasında hata oluştu!' 
        });
    }
});
module.exports = router; 