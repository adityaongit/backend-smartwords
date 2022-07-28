
const Post = require('../models/postModel.js')
const User = require('../models/userModel.js')
const HttpError = require('../models/errorModels.js')
const fs = require('fs')
const path = require('path')
const { v4: uuid } = require('uuid')



// -------------------------------CREATE a post
// POST: api/posts
// Protected
const createPost = async (req, res, next) => {
    try {

        let { title, category, description } = req.body
        if (!title || !category || !description || !req.files) {
            return next(new HttpError("Fill in all the fields and choose thumbnail.", 422))
        }

        const { thumbnail } = req.files
        // check thumbnail file size
        if (thumbnail.size > 2000000) {
            return next(new HttpError("Thumbnail file size must be smaller than 2MB.", 422))
        }

        let fileName
        fileName = thumbnail.name
        let splittedFileName = fileName.split('.')
        let newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1]
        thumbnail.mv(path.join(__dirname, '..', '/uploads', newFileName), async (err) => {

            if (err) {
                return next(new HttpError(err))
            } else {
                const newPost = await Post.create({ title, category, description, thumbnail: newFileName, creator: req.user.id })
                if (!newPost) {
                    return next(new HttpError("Post could'nt be created.", 422))
                }

                // find user and increase post count by 1
                const currentUser = await User.findById(req.user.id)
                const userPostCount = currentUser.posts + 1
                await User.findByIdAndUpdate(req.user.id, { posts: userPostCount })

                res.status(201).json(newPost)
            }
        })


    } catch (err) {
        return next(new HttpError(err))
    }

}




// -------------------------------GET all post
// GET: api/posts
// Unrotected
const getPosts = async (req, res, next) => {
    try {

        const posts = await Post.find().sort({ updatedAt: -1 })
        res.status(200).json(posts)

    } catch (err) {
        return next(new HttpError(err))
    }
}




// -------------------------------GET single post
// GET: api/posts/:id
// Unrotected
const getPost = async (req, res, next) => {
    try {

        const postId = req.params.id
        const post = await Post.findById(postId)
        if (!post) {
            return next(new HttpError("Requested post does'nt exist", 422))
        }
        res.status(200).json(post)

    } catch (err) {
        return next(new HttpError(err))
    }
}




// -------------------------------GET category posts
// GET: api/posts/categories/:category
// Unrotected
const getCategoryPosts = async (req, res, next) => {
    try {

        const { category } = req.params
        const categoryPosts = await Post.find({ category }).sort({ createdAt: -1 })
        res.status(200).json(categoryPosts)

    } catch (err) {
        return next(new HttpError(err))
    }
}






// -------------------------------GET user/authors post
// GET: api/posts/users/:id
// Unrotected
const getUserPosts = async (req, res, next) => {
    try {

        const { id } = req.params
        const userPosts = await Post.find({ creator: id }).sort({ createdAt: -1 })
        res.status(200).json(userPosts)

    } catch (err) {
        return next(new HttpError(err))
    }
}




// -------------------------------Edit posts
// PATCH: api/posts/:id
// Protected
const editPost = async (req, res, next) => {
    try {

        let fileName;
        let newFileName;
        let updatedPost;
        const postId = req.params.id
        let { title, category, description } = req.body

        if (!title || !category || description.length < 15) {
            return next(new HttpError("Fill in all the fields., 422"))
        }

        // get old post from DB
        const oldPost = await Post.findById(postId)

        // delete old thumbnail from upload
        if (req.user.id == oldPost.creator) {

            if (!req.files) {
                updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description }, { new: true })
            } else {

                fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), async (err) => {
                    if (err) {
                        return next(new HttpError("yooooo"))
                    }
                })
                // upload new thumbnail
                const { thumbnail } = req.files
                if (thumbnail.size > 2000000) {
                    return next(new HttpError("Thumbnail file size must be smaller than 2MB.", 422))
                }
                fileName = thumbnail.name;
                let splittedFileName = fileName.split('.')
                newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1]
                thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {

                    if (err) {
                        return next(new HttpError(err))
                    }
                })
                updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description, thumbnail: newFileName }, { new: true })
            }
        }

        if (!updatedPost) {
            return next(new HttpError("Could'nt update post.", 400))
        }
        res.status(200).json(updatedPost)

    } catch (err) {
        return next(new HttpError(err))
    }
}




// -------------------------------Delete posts
// DELETE: api/posts/:id
// Protected
const deletePost = async (req, res, next) => {
    try {

        const postId = req.params.id
        if (!postId) {
            return next(new HttpError("Requested post does'nt exist.", 422))
        }

        const post = await Post.findById(postId)
        const fileName = post?.thumbnail

        // delete thumbnail from upload
        if (req.user.id == post.creator) {


            fs.unlink(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
                if (err) {
                    return next(new HttpError(err))
                } else {
                    await Post.findByIdAndDelete(postId)

                    // find user and decrease his post count by 1
                    const currentUser = await User.findById(req.user.id)
                    const userPostCount = currentUser?.posts - 1
                    await User.findByIdAndUpdate(req.user.id, { posts: userPostCount })
                }
            })
            res.json(`Post ${postId} deleted successfully.`)
        } else {
            return next(new HttpError("Post could'nt be deleted", 403))
        }
    } catch (err) {
        return next(new HttpError(err))
    }
}


module.exports = { createPost, getPosts, getPost, getCategoryPosts, getUserPosts, editPost, deletePost }