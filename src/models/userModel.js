const mongoose = require('mongoose');
// const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  chat_id:{
    type:String,
    required:true
  }
});

module.exports = new mongoose.model("User", userSchema);

