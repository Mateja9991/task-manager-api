const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/user');
const auth = require('../middleware/auth');
const router = new express.Router();
const avatar = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {

        if (!file.originalname.match(/\.(jpg|png|jpeg)$/)) {
            cb(new Error('File must be img'));
        }
        cb(undefined, true);
    }
});

router.post('/users', async (req, res) => {
    const user = new User(req.body);
    try {
        await user.save();
        const token = await user.generateAuthToken();
        res.send({ user, token });
    }
    catch (e) {
        res.status(400).send(e);
    }
});

router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        res.send({ user, token });
    }
    catch (e) {
        res.status(400).send(e);
    }
});

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter(token => token.token !== req.token);
        await req.user.save();
        res.send();
    }
    catch (e) {
        res.status(500).send();
    }
})

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();
        res.send();
    }
    catch (e) {
        res.status(500).send();
    }
})

router.post('/users/me/avatar', auth, avatar.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).png().resize({ width: 250, height: 250 }).toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.send();
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message });
});

router.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
});

router.get('/users/:id', auth, async (req, res) => {

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send();
        }
        res.send(user);
    }
    catch (e) {
        res.status(500).send();
    }
});

router.get('/users/me/avatar', auth, (req, res) => {
    try {
        if (!req.user.avatar) {
            return res.status(404).send();
        }
        res.set('Content-type', 'image/png');
        res.send(req.user.avatar);
    }
    catch (e) {
        res.status(500).send();
    }
})

router.get('/users/:id/avatar', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        console.log(user);
        if (!user || !user.avatar) {
            return res.status(404).send();
        }
        res.set('Content-type', 'image/png');
        res.send(user.avatar);
    }
    catch (e) {
        res.status(500).send();
    } U
})

router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedToUpdate = ['name', 'email', 'password', 'age'];
    const isValidUpdate = updates.every(update => allowedToUpdate.includes(update));

    if (!isValidUpdate) {
        return res.status(404).send();
    }

    try {
        updates.forEach(update => {
            req.user[update] = req.body[update];
        });
        await req.user.save();
        res.send(req.user);
    }
    catch (e) {
        res.status(400).send();
    }
});

router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove();
        res.send(req.user);
    }
    catch (e) {
        res.status(500).send();
    }
});

router.delete('/users/me/avatar', auth, async (req, res) => {
    try {
        if (req.user.avatar === undefined) {
            return res.status(404).send();
        }
        req.user.avatar = undefined;
        await req.user.save();
        res.send();
    }
    catch (e) {
        res.status(500).send();
    }
})


module.exports = router;