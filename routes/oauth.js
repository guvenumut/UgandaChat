const axios = require('axios');
const router = require('express').Router();
const { db } = require('../config/firebase-config');

router.get('/auth/google', (req, res) => {
    const redirectUrl = 'http://localhost:3000/auth/google/callback';
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUrl}&response_type=code&scope=email profile`;
    res.redirect(url);
});

router.get('/auth/google/callback', async (req, res) => {
	const code = req.query.code;
	const redirectUri = 'http://localhost:3000/auth/google/callback';

	try {
		const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
			client_id: process.env.GOOGLE_CLIENT_ID,
			client_secret: process.env.GOOGLE_CLIENT_SECRET,
			code,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
		});

		const accessToken = tokenRes.data.access_token;
		const profileRes = await axios.get(
			'https://www.googleapis.com/oauth2/v2/userinfo',
			{ headers: { Authorization: `Bearer ${accessToken}` } }
		);

		const userQuery = await db.collection('users')
			.where('email', '==', profileRes.data.email)
			.get();

		if (!userQuery.empty) {
			const userDoc = userQuery.docs[0];
			const userData = userDoc.data();
			
			await db.collection('users').doc(userDoc.id).update({
				isOnline: true,
				lastSeen: new Date()
			});

			req.session.user = {
				id: userDoc.id,
				username: userData.username,
				email: userData.email,
				isOnline: true
			};

			res.redirect('/rooms');
		} else {
			
			req.session.tempOAuthUser = {
				email: profileRes.data.email,
				name: profileRes.data.name,
				authProvider: 'google'
			};

			res.redirect('/create-username');
		}
		
	} catch (err) {
		console.error('Google OAuth Error:', err);
		res.redirect('/login?error=oauth_failed');
	}
});

router.get('/create-username', (req, res) => {
	if (!req.session.tempOAuthUser) {
		return res.redirect('/login');
	}

	res.render('create-username', {
		title: 'Kullanıcı Adı Seç - UgandaChat',
		email: req.session.tempOAuthUser.email,
		name: req.session.tempOAuthUser.name
	});
});

router.post('/create-username', async (req, res) => {
	const { username } = req.body;

	if (!req.session.tempOAuthUser) {
		return res.status(400).json({ error: 'Geçersiz session' });
	}

	if (!username || username.length < 3 || username.length > 20) {
		return res.status(400).json({ error: 'Username 3-20 karakter olmalı!' });
	}

	try {
		
		const existingUser = await db.collection('users')
			.where('username', '==', username)
			.get();

		if (!existingUser.empty) {
			return res.status(400).json({ error: 'Bu kullanıcı adı alınmış!' });
		}

		
		const newUserRef = await db.collection('users').add({
			email: req.session.tempOAuthUser.email,
			username: username,
			authProvider: req.session.tempOAuthUser.authProvider,
			isOnline: true,
			createdAt: new Date(),
			lastSeen: new Date()
		});

		
		const tempUser = req.session.tempOAuthUser;
		delete req.session.tempOAuthUser;

		req.session.user = {
			id: newUserRef.id,
			username: username,
			email: tempUser.email,
			isOnline: true
		};

		res.json({ success: true });
		
	} catch (error) {
		console.error('Username creation error:', error);
		res.status(500).json({ error: 'Kullanıcı oluşturma hatası!' });
	}
});

//commit deneme
module.exports = router;