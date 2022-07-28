const { Schema, model } = require('mongoose')

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    avatar: {
        type: String,
        default:
            "https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg",
    },
    posts: { type: Number, default: 0 },
});

module.exports = model('User', userSchema)
