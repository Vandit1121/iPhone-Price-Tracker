const mongoose = require('mongoose');
// const passportLocalMongoose = require('passport-local-mongoose');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  password:{
    type:String,
    required:true
  }
});

module.exports = new mongoose.model("Admin", adminSchema);

