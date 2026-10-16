const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Item = require("./models/Item");

const app = express();
const PORT = process.env.PORT || 5000;

const CATEGORIES = ["Electronics", "ID Cards", "Books", "Accessories", "Other"];

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

function normalize(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function words(value = "") {
  return normalize(value)
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

function matchScore(lost, found) {
  if (
    !lost ||
    !found ||
    lost.type !== "Lost" ||
    found.type !== "Found" ||
    lost.status !== "Active" ||
    found.status !== "Active"
  ) {
    return 0;
  }

  let score = lost.category === found.category ? 3 : 0;
  const lostTitle = normalize(lost.title);
  const foundTitle = normalize(found.title);

  if (lostTitle === foundTitle) {
    score += 5;
  } else {
    const foundWords = new Set(words(foundTitle));
    score += Math.min(
      words(lostTitle).filter((word) => foundWords.has(word)).length * 2,
      4,
    );
  }

  const lostDescriptionWords = new Set(words(lost.description));

  if (words(found.description).some((word) => lostDescriptionWords.has(word))) {
    score += 1;
  }

  if (normalize(lost.location) === normalize(found.location)) {
    score += 2;
  }

  return score;
}

async function getLinkedReport(item) {
  if (item.matchedItemId) {
    const linked = await Item.findById(item.matchedItemId);
    if (linked) return linked;
  }

  return Item.findOne({ matchedItemId: item._id });
}

app.get("/", (req, res) => {
  res.send("CampusLoop API is running.");
});

app.get("/api/items", async (req, res) => {
  try {
    const allItems = await Item.find().sort({ createdAt: -1 });
    const activeItems = allItems.filter((item) => item.status === "Active");

    const results = allItems.map((item) => {
      const data = item.toObject();

      if (item.type === "Lost" && item.status === "Active") {
        data.possibleMatches = activeItems
          .filter((found) => found.type === "Found")
          .map((found) => ({
            found,
            score: matchScore(item, found),
          }))
          .filter((result) => result.score >= 3)
          .sort((a, b) => b.score - a.score)
          .map(({ found, score }) => ({
            ...found.toObject(),
            matchScore: score,
          }));
      }

      return data;
    });

    res.json(results);
  } catch (error) {
    console.error("Get items error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/claims", async (req, res) => {
  try {
    const claims = await Item.find({
      type: "Found",
      status: { $in: ["Claim Pending", "Matched", "Returned"] },
    }).sort({ updatedAt: -1 });

    res.json(claims);
  } catch (error) {
    console.error("Get claims error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/items", async (req, res) => {
  try {
    const { title, description, category, location, type, contact } = req.body;

    const fields = [title, description, category, location, type, contact];

    if (!fields.every((value) => typeof value === "string" && value.trim())) {
      return res.status(400).json({
        message: "Please complete every field.",
      });
    }

    if (!CATEGORIES.includes(category) || !["Lost", "Found"].includes(type)) {
      return res.status(400).json({
        message: "Invalid category or report type.",
      });
    }

    const item = await Item.create({
      title: title.trim(),
      description: description.trim(),
      category,
      location: location.trim(),
      type,
      contact: contact.trim(),
    });

    res.status(201).json({
      message: "Report created successfully.",
      item,
    });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Submit a claim. A matching Lost report is optional.
app.post("/api/items/:id/claim", async (req, res) => {
  try {
    const { lostItemId, claimedBy, claimContact, claimEvidence } = req.body;

    if (
      ![claimedBy, claimContact, claimEvidence].every(
        (value) => typeof value === "string" && value.trim(),
      )
    ) {
      return res.status(400).json({
        message: "Enter claimant name, contact and ownership evidence.",
      });
    }

    const found = await Item.findById(req.params.id);

    if (!found || found.type !== "Found") {
      return res.status(404).json({ message: "Found report not found." });
    }

    if (found.status !== "Active") {
      return res.status(409).json({
        message: "This Found report is no longer active.",
      });
    }

    let lost = null;

    if (lostItemId) {
      if (!mongoose.isValidObjectId(lostItemId)) {
        return res.status(400).json({ message: "Invalid Lost report ID." });
      }

      lost = await Item.findById(lostItemId);

      if (!lost || lost.type !== "Lost" || lost.status !== "Active") {
        return res.status(409).json({
          message: "The selected Lost report is not active.",
        });
      }

      if (matchScore(lost, found) < 3) {
        return res.status(400).json({
          message: "The selected reports do not appear to match.",
        });
      }
    }

    found.status = "Claim Pending";
    found.claimedBy = claimedBy.trim();
    found.claimContact = claimContact.trim();
    found.claimEvidence = claimEvidence.trim();
    found.matchedItemId = lost ? lost._id : null;

    if (lost) {
      lost.status = "Claim Pending";
      lost.matchedItemId = found._id;
      await lost.save();
    }

    await found.save();

    res.json({
      message: lost
        ? "Claim submitted. Both reports await staff verification."
        : "Claim submitted without a matching Lost report. Staff must verify ownership.",
      item: found,
    });
  } catch (error) {
    console.error("Claim error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Verify a claim; handover is completed separately.
app.patch("/api/items/:id/approve-claim", async (req, res) => {
  try {
    const { verifiedBy, staffNotes = "" } = req.body;

    if (typeof verifiedBy !== "string" || !verifiedBy.trim()) {
      return res.status(400).json({
        message: "Enter staff name or ID.",
      });
    }

    const found = await Item.findById(req.params.id);

    if (!found || found.type !== "Found") {
      return res.status(404).json({ message: "Found report not found." });
    }

    if (found.status !== "Claim Pending") {
      return res.status(409).json({
        message: `Cannot approve: current status is ${found.status}.`,
      });
    }

    const lost = await getLinkedReport(found);

    if (lost && lost.type !== "Lost") {
      return res.status(409).json({
        message: "The linked report is not a Lost report.",
      });
    }

    if (lost && !["Claim Pending", "Matched"].includes(lost.status)) {
      return res.status(409).json({
        message: `Linked Lost report status is ${lost.status}.`,
      });
    }

    found.status = "Matched";
    found.verifiedBy = verifiedBy.trim();
    found.staffNotes = String(staffNotes).trim();

    if (lost) {
      lost.status = "Matched";
      lost.verifiedBy = verifiedBy.trim();
      lost.staffNotes = String(staffNotes).trim();
      lost.matchedItemId = found._id;
      found.matchedItemId = lost._id;
      await lost.save();
    }

    await found.save();

    res.json({
      message: lost
        ? "Claim verified. Found is Matched and Lost is Matched."
        : "Claim verified. Found is Matched; no Lost report is linked.",
    });
  } catch (error) {
    console.error("Approval error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Mark the Found report Returned and its linked Lost report Closed.
app.patch("/api/items/:id/return", async (req, res) => {
  try {
    const found = await Item.findById(req.params.id);

    if (!found || found.type !== "Found") {
      return res.status(404).json({ message: "Found report not found." });
    }

    if (found.status !== "Matched") {
      return res.status(409).json({
        message: `Claim must be verified first. Current status: ${found.status}.`,
      });
    }

    const lost = await getLinkedReport(found);

    if (lost && lost.type !== "Lost") {
      return res.status(409).json({
        message: "The linked report is not a Lost report.",
      });
    }

    if (lost && lost.status !== "Matched") {
      return res.status(409).json({
        message: `Linked Lost report status is ${lost.status}.`,
      });
    }

    const returnedAt = new Date();

    // Save the Lost report first. If saving the Found report then fails,
    // restore the Lost report to Matched.
    let lostWasSaved = false;

    if (lost) {
      lost.status = "Closed";
      lost.returnedAt = returnedAt;
      lost.matchedItemId = found._id;
      await lost.save();
      lostWasSaved = true;
    }

    try {
      found.status = "Returned";
      found.returnedAt = returnedAt;

      if (lost) found.matchedItemId = lost._id;

      await found.save();
    } catch (saveError) {
      if (lostWasSaved) {
        await Item.updateOne(
          { _id: lost._id },
          { $set: { status: "Matched", returnedAt: null } },
        );
      }
      throw saveError;
    }

    res.json({
      message: lost
        ? "Success: Found is Returned and Lost is Closed."
        : "Success: Found is Returned. No linked Lost report exists.",
      foundStatus: found.status,
      lostStatus: lost ? "Closed" : null,
      foundId: String(found._id),
      lostId: lost ? String(lost._id) : null,
    });
  } catch (error) {
    console.error("Return error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Delete an individual active report, or both linked completed reports.
app.delete("/api/items/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Report not found." });
    }

    if (["Claim Pending", "Matched"].includes(item.status)) {
      return res.status(409).json({
        message: "Resolve the claim and complete the handover before deleting.",
      });
    }

    const linked = await getLinkedReport(item);
    const itemCompleted = ["Returned", "Closed"].includes(item.status);

    if (linked) {
      const linkedCompleted = ["Returned", "Closed"].includes(linked.status);

      if (!itemCompleted || !linkedCompleted) {
        return res.status(409).json({
          message:
            "Both linked reports must be completed before deleting them together.",
        });
      }

      // Remove both records. Restore the first if the second deletion fails.
      const firstDeleted = await Item.deleteOne({ _id: item._id });

      if (!firstDeleted.deletedCount) {
        return res.status(500).json({
          message: "Could not delete the selected report.",
        });
      }

      try {
        const secondDeleted = await Item.deleteOne({ _id: linked._id });

        if (!secondDeleted.deletedCount) {
          await Item.create([item.toObject()]);
          return res.status(500).json({
            message:
              "The linked report could not be deleted. The selected report was restored.",
          });
        }
      } catch (deleteError) {
        await Item.create([item.toObject()]);
        throw deleteError;
      }

      return res.json({
        message: "Both linked completed reports were deleted.",
        deletedIds: [String(item._id), String(linked._id)],
      });
    }

    await Item.deleteOne({ _id: item._id });

    return res.json({
      message: "Report deleted successfully.",
      deletedIds: [String(item._id)],
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: error.message });
  }
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(`CampusLoop API running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
