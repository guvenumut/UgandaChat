const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http');
const session = require('express-session');
const { Server } = require('socket.io');
const registerRoutes = require('./routes/register');
const loginRoutes = require('./routes/login');
const roomsRoutes = require('./routes/rooms');
const logoutRoutes = require('./routes/logout');
const { db, admin } = require('./config/firebase-config');
const dotenv = require('dotenv');
dotenv.config();
const {blockAuth,isAuth} = require('./middleware/auth');
const oauthRoutes = require('./routes/oauth');

const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', './views');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET ,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));


app.use('/register', registerRoutes);
app.use('/login', loginRoutes);
app.use('/rooms', roomsRoutes);
app.use('/logout', logoutRoutes);
app.use('/', oauthRoutes);



app.get('/',blockAuth, (req, res) => {
    res.render('index', { 
        title: 'UgandaChat - Ana Sayfa' 
    });
});

app.use(express.static('public'));
app.use((req, res, next) => {
    console.log(`404 - Path not found: ${req.originalUrl}`);
    
    if (req.session && req.session.user) {
        return res.redirect('/rooms');
    } else {
        return res.redirect('/login');
    }
});


const activeRooms = new Map();
const userSockets = new Map();

io.on('connection', (socket) => {
    console.log(`📱 User connected: ${socket.id}`);

    socket.on('join-room', async (data) => {
        try {
            const { roomId, user } = data;
            
            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.leave(room);
                }
            });

            socket.join(roomId);
            
            socket.userId = user.id;
            socket.roomId = roomId;
            socket.user = user;
            
            if (!activeRooms.has(roomId)) {
                activeRooms.set(roomId, new Set());
            }
            activeRooms.get(roomId).add(user);
            userSockets.set(user.id, socket.id);

            const roomUsers = Array.from(activeRooms.get(roomId));
            
            socket.to(roomId).emit('user-joined', {
                user: user,
                users: roomUsers
            });

            socket.emit('room-users', roomUsers);

            const messages = await getChatHistory(roomId);
            socket.emit('chat-history', messages);

            console.log(`👤 ${user.username} joined room ${roomId}`);
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    socket.on('send-message', async (data) => {
        try {
            const { roomId, user, text, timestamp } = data;
            
            const messageData = {
                roomId,
                userId: user.id,
                username: user.username,
                text,
                timestamp: new Date(timestamp)
            };

            await db.collection('messages').add(messageData);

            await db.collection('rooms').doc(roomId).update({
                messageCount: admin.firestore.FieldValue.increment(1),
                lastActivity: new Date()
            });

            io.to(roomId).emit('message', {
                user: user,
                text: text,
                timestamp: timestamp
            });

            console.log(`💬 Message from ${user.username} in room ${roomId}: ${text}`);
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    socket.on('typing', (data) => {
        const { roomId, user } = data;
        socket.to(roomId).emit('typing', { user });
    });

    socket.on('stop-typing', (data) => {
        const { roomId, user } = data;
        socket.to(roomId).emit('stop-typing', { user });
    });

    socket.on('leave-room', (data) => {
        const { roomId, user } = data;
        handleUserLeave(socket, roomId, user);
    });

    socket.on('disconnect', () => {
        console.log(`📱 User disconnected: ${socket.id}`);
        
        if (socket.roomId && socket.user) {
            handleUserLeave(socket, socket.roomId, socket.user);
        }
        
        if (socket.userId) {
            userSockets.delete(socket.userId);
        }
    });
});

function handleUserLeave(socket, roomId, user) {
    if (activeRooms.has(roomId)) {
        const roomUsers = activeRooms.get(roomId);
        roomUsers.delete(user);
        
        if (roomUsers.size === 0) {
            activeRooms.delete(roomId);
        } else {
            socket.to(roomId).emit('user-left', {
                user: user,
                users: Array.from(roomUsers)
            });
        }
    }
    
    socket.leave(roomId);
    console.log(`👤 ${user.username} left room ${roomId}`);
}

async function getChatHistory(roomId, limit = process.env.MAX_CHAT_HISTORY || 50) {
    try {
        const snapshot = await db.collection('messages')
            .where('roomId', '==', roomId)
            .limit(limit)
            .get();

        const messages = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                user: {
                    id: data.userId,
                    username: data.username
                },
                text: data.text,
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
            });
        });

        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        return messages;
    } catch (error) {
        console.error('Error getting chat history:', error);
        return [];
    }
}

server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});