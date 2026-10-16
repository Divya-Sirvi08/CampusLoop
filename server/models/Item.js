const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Electronics", "ID Cards", "Books", "Accessories", "Other"],
      required: true,
    },
    location: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Lost", "Found"],
      required: true,
    },
    contact: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Active", "Claim Pending", "Matched", "Returned", "Closed"],
      default: "Active",
    },
    matchedItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },
    claimedBy: { type: String, default: "" },
    claimContact: { type: String, default: "" },
    claimEvidence: { type: String, default: "" },
    verifiedBy: { type: String, default: "" },
    staffNotes: { type: String, default: "" },
    returnedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Item", itemSchema);
