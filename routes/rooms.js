const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-config');
const isAuth = require('../middleware/auth');
router.get('/', isAuth, async (req, res) => {
    try {
        const roomsSnapshot = await db.collection('rooms').orderBy('createdAt', 'desc').get();
        console.log(roomsSnapshot.docs.map(doc=> doc.data()));
        const rooms = [];
        roomsSnapshot.forEach(doc => {
            rooms.push({
                id: doc.id,
                ...doc.data()
            });
        });
        res.render('rooms', { 
            title: 'Chat Odaları - UgandaChat',
            rooms: rooms,
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.render('rooms', { 
            title: 'Chat Odaları - UgandaChat',
            rooms: [],
            user: req.session.user || null,
            error: 'Odalar yüklenirken hata oluştu'
        });
    }
});
router.post('/', isAuth, async (req, res) => {
    try {
        const { roomName, roomDescription, isPrivate } = req.body;
        if (!roomName || roomName.trim().length < 3) {
            return res.status(400).json({ 
                error: 'Oda adı en az 3 karakter olmalı!' 
            });
        }
        if (roomName.trim().length > 30) {
            return res.status(400).json({ 
                error: 'Oda adı en fazla 30 karakter olabilir!' 
            });
        }
        const existingRoom = await db.collection('rooms')
            .where('name', '==', roomName.trim())
            .get();
        if (!existingRoom.empty) {
            return res.status(400).json({ 
                error: 'Bu oda adı zaten kullanılıyor!' 
            });
        }
        const roomData = {
            name: roomName.trim(),
            description: roomDescription ? roomDescription.trim() : '',
            isPrivate: isPrivate === 'on' || isPrivate === true,
            createdAt: new Date(),
            createdBy: req.session.user?.username || 'Bilinmiyor',
            createdById: req.session.user?.id || null,
            memberCount: 0,
            messageCount: 0,
            lastActivity: new Date()
        };
        const docRef = await db.collection('rooms').add(roomData);
        res.status(201).json({ 
            message: 'Oda başarıyla oluşturuldu!',
            roomId: docRef.id,
            room: { id: docRef.id, ...roomData }
        });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ 
            error: 'Oda oluşturulurken hata oluştu!' 
        });
    }
});
router.get('/:id', isAuth, async (req, res) => {
    try {
        const roomId = req.params.id;
        const roomDoc = await db.collection('rooms').doc(roomId).get();
        if (!roomDoc.exists) {
            return res.status(404).render('error', { 
                title: 'Oda Bulunamadı',
                message: 'Aradığınız oda bulunamadı.',
                backLink: '/rooms'
            });
        }
        const roomData = { id: roomDoc.id, ...roomDoc.data() };
        console.log(roomData.messages + "messages");
        res.render('chat', { 
            title: `${roomData.name} - UgandaChat`,
            room: roomData,
            user: req.session.user || null,
            userJSON: JSON.stringify(req.session.user || null),
            roomJSON: JSON.stringify(roomData),
        });
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).render('error', { 
            title: 'Hata',
            message: 'Oda yüklenirken hata oluştu.',
            backLink: '/rooms'
        });
    }
});
module.exports = router;