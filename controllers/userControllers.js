const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/userModel.js')
const HttpError = require('../models/errorModels.js')
const fs = require('fs')
const path = require('path')
const { v4: uuid } = require('uuid')


// -------------------------------Register new User
// POST: api/users/register


// Unprotected
const registerUser = async (req, res, next) => {
    try {

        const { name, email, password, password2 } = req.body
        if (!name || !email || !password || !password2) {
            return next(new HttpError("Fill in all fields.", 422))
        }

        const newEmail = email.toLowerCase()

        const emailExists = await User.findOne({ email: newEmail })
        if (emailExists) {
            return next(new HttpError("Email already exists.", 422))
        }

        if ((password.trim()).length < 6) {
            return next(new HttpError("Password must have atleast 6 characters.", 422))
        }

        if (password != password2) {
            return next(new HttpError("Confirm password must be same as password.", 422))
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPass = await bcrypt.hash(password, salt)
        const newUser = User.create({ name, email: newEmail, password: hashedPass })
        res.status(201).json(`New user registered`)

    } catch (err) {
        return next(new HttpError("User registration failed", 422))
    }
}





// -------------------------------Login a registered User
// POST: api/users/login


// Unprotected
const loginUser = async (req, res, next) => {
    try {

        const { email, password } = req.body

        if (!email || !password) {
            return next(new HttpError("Fill in all the fields", 422))
        }

        const newEmail = email.toLowerCase()

        const user = await User.findOne({ email: newEmail })
        if (!user) {
            return next(new HttpError("Invalid email", 422))
        }

        const comparePassword = await bcrypt.compare(password, user.password)
        if (!comparePassword) {
            return next(new HttpError("Invalid password,", 422))
        }

        const { _id: id, name } = user
        const token = jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: "1d" })
        res.status(200).json({ token, id, name })

    } catch (err) {
        return next(new HttpError("Invalid name or password.", 422))
    }
}






// -------------------------------User Profile
// GET: api/users/:id
// Protected

const getUser = async (req, res, next) => {
    try {

        const { id } = req.params
        const user = await User.findById(id).select('-password')
        if (!user) {
            return next(new HttpError("User not found", 404))
        }
        res.status(200).json(user)

    } catch (err) {
        return next(new HttpError("Cannot fetch the user", 422))
    }
}





// -------------------------------Change Avatar
// POST: api/users/change-avatar
// Protected

const changeAvatar = async (req, res, next) => {

    try {

        if (!req.files.avatar) {
            return next(new HttpError("Please select an error", 422))
        }

        // find user from database
        const user = await User.findById(req.user.id)

        // delete old avatar, if exists
        if (user.avatar) {
            fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
                if (err) {
                    return next(new HttpError("err"))
                }
            })
        }

        const { avatar } = req.files
        if (avatar.size > 500000) {
            next(new HttpError("File size must be smaller than 500kb.", 422))
        }

        let fileName
        fileName = avatar.name
        let splittedFileName = fileName.split('.')
        let newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1]
        avatar.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {

            if (err) {
                return next(new HttpError(err))
            }

            const updatedAvatar = await User.findByIdAndUpdate(req.user.id, { avatar: newFileName }, { new: true })
            if (!updatedAvatar) {
                return next(new HttpError("Avatar could'nt be changed.", 422))
            }
            res.status(200).json(updatedAvatar)

        })



    } catch (err) {
        return next(new HttpError(err))
    }
}






// -------------------------------Edit User details (from profile
// POST: api/users/edit-user
// Protected

const editUser = async (req, res, next) => {
    try {

        const { name, email, currentPassword, newPassword, confirmNewPassword } = req.body
        if (!name || !email || !currentPassword || !newPassword) {
            return next(new HttpError("Fill in all the fields.", 422))
        }

        // get user from database
        const user = await User.findById(req.user.id)
        if (!user) {
            return next(new HttpError("User not found.", 403))
        }

        // make sure email does'nt already exist
        const emailExist = await User.findOne({ email })
        if (emailExist && (emailExist._id != req.user.id)) {
            return next(new HttpError("Email already exist.", 422))
        }

        // compare current password to DB password
        const validateUserPassword = await bcrypt.compare(currentPassword, user.password)
        if (!validateUserPassword) {
            return next(new HttpError("Invalid current password.", 422))
        }

        // compare new password
        if (newPassword !== confirmNewPassword) {
            return next(new HttpError("Confirm password must be similar to new password.", 422))
        }

        // hash new password
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(newPassword, salt)

        // update user info in DB
        const newInfo = await User.findByIdAndUpdate(req.user.id, { name, email, password: hash }, { new: true })
        
        res.status(200).json(newInfo)


    } catch (err) {
        return next(new HttpError(err))
    }
}







// -------------------------------Get Authors
// POST: api/users/authors
// Unprotected

const getAuthors = async (req, res, next) => {
    try {

        const authors = await User.find().select('-password')
        res.json(authors)

    } catch (err) {
        return next(new HttpError("Cannot get the user", 402))
    }
}


module.exports = { registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors }