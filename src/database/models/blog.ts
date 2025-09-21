var mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
  title: { type: String },
  subtitle: { type: String },
  description: { type: String },
  blogImage: { type: String },
  thumbnailImage: { type: String },
  tag: { type: String },
  // priority: { type: Number, default: 1 },
  features: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

export const blogModel = mongoose.model('blog', blogSchema);