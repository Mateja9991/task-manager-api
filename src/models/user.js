const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Task = require('./task');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email failed');
            }
        },
        trim: true,
        lowercase: true
    },
    age: {
        type: Number,
        required: true,
        min: 0,
        max: 150,
        default: 0
    },
    password: {
        type: String,
        required: true,
        minlength: [7, 'Premalo'],
        trim: true,
        validate(value) {
            if (value.includes('password'))
                throw new Error('pass in pass');
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true,
        }
    }],
    avatar: {
        type: Buffer,
    }
}, {
    timestamps: true
});

userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
});

//Hash plaintext passowrd before saving
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

//Delete user tassk when user is removed 
userSchema.pre('remove', async function (next) {
    await Task.deleteMany({ owner: this._id });
    next();
});
//
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Unable to login.');
    }
    if (!await bcrypt.compare(password, user.password)) {
        throw new Error('Unable to login.');
    }
    return user;
};

userSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();

    delete userObject.password;
    delete userObject.tokens;
    delete userObject.avatar;

    console.log(userObject);
    return userObject;
};

userSchema.methods.generateAuthToken = async function () {
    const user = this;
    const token = jwt.sign({ _id: user._id.toString() }, process.env.TOKEN_KEY, { expiresIn: '1 day' });
    user.tokens = user.tokens.concat({ token });
    await user.save();
    return token;
}

const User = mongoose.model('User', userSchema);

module.exports = User;