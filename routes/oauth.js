const axios = require('axios');
const router = require('express').Router();

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
			{
				headers: { Authorization: `Bearer ${accessToken}` },
			}
		);

		console.log('🔗 Google User:', {
			email: profileRes.data.email,
		});
        

		res.redirect('http://localhost:3000/success');
	} catch (err) {
		console.error('Google OAuth Error:', err);
		res.send('Google login failed');
	}
});





module.exports = router;