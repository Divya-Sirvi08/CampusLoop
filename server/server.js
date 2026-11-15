const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Item = require("./models/Item");
const { getSemanticSimilarity } = require("./ai/smartMatching");

const app = express();
const PORT = process.env.PORT || 5000;

const CATEGORIES = ["Electronics", "ID Cards", "Books", "Accessories", "Other"];

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function words(value = "") {
  return normalize(value)
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

const stopWords = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "i",
  "my",
  "me",
  "mine",
  "we",
  "our",
  "you",
  "your",
  "it",
  "this",
  "that",
  "there",
  "where",
  "when",
  "what",
  "which",
  "who",
  "how",
  "can",
  "could",
  "would",
  "should",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "please",
  "help",
  "find",
  "search",
  "look",
  "looking",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "near",
  "from",
  "with",
  "and",
  "or",
  "any",
  "some",
  "all",
  "me",
  "lost",
  "found",
  "item",
  "items",
  "report",
  "reports",
  "something",
  "something",
  "hello",
  "hi",
  "hey",
  "was",
  "been",
  "about",
  "tell",
  "show",
  "want",
  "need",
  "get",
  "got",
  "have",
  "had",
  "please",
  "available",
]);

function getSearchTerms(message) {
  return [...new Set(words(message).filter((word) => !stopWords.has(word)))];
}

// Score a report against the student's message.
function calculateSearchScore(message, item) {
  const searchTerms = getSearchTerms(message);

  if (searchTerms.length === 0) return 0;

  const titleWords = words(item.title);
  const descriptionWords = words(item.description);
  const locationWords = words(item.location);
  const categoryWords = words(item.category);

  let score = 0;

  for (const term of searchTerms) {
    if (titleWords.includes(term)) score += 5;
    if (descriptionWords.includes(term)) score += 2;
    if (locationWords.includes(term)) score += 4;
    if (categoryWords.includes(term)) score += 3;
  }

  const normalizedMessage = normalize(message);
  const normalizedTitle = normalize(item.title);

  if (normalizedTitle && normalizedMessage.includes(normalizedTitle)) {
    score += 5;
  }

  return score;
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

// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.send("CampusLoop API is running.");
});

// =====================================================
// RULE-BASED CAMPUSLOOP CHATBOT
// NO GEMINI API REQUIRED
// =====================================================

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        reply: "Please enter a message.",
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        reply: "Please keep your message under 1,000 characters.",
      });
    }

    const userMessage = normalize(message);

    // ---------------------------------------------
    // COMMON SUPPORT QUESTIONS
    // ---------------------------------------------

    if (
      userMessage.includes("hello") ||
      userMessage.includes("hi") ||
      userMessage.includes("hey")
    ) {
      return res.json({
        reply:
          "Hello! Welcome to CampusLoop. I can help you search lost and found items, find possible matches, and explain how to report or claim an item. What are you looking for?",
      });
    }

    if (
      userMessage.includes("how to report") ||
      userMessage.includes("report an item") ||
      userMessage.includes("create report") ||
      userMessage.includes("post an item")
    ) {
      return res.json({
        reply:
          "To report an item on CampusLoop:\n\n" +
          "1. Open the Report Item section.\n" +
          "2. Choose Lost or Found.\n" +
          "3. Enter the item name and description.\n" +
          "4. Select its category.\n" +
          "5. Enter the location and contact details.\n" +
          "6. Submit your report.\n\n" +
          "Your report will appear on the CampusLoop listing board.",
      });
    }

    if (
      userMessage.includes("how to claim") ||
      userMessage.includes("claim an item") ||
      userMessage.includes("claim process")
    ) {
      return res.json({
        reply:
          "To claim an item:\n\n" +
          "1. Browse the Found Items section.\n" +
          "2. Select the item you believe belongs to you.\n" +
          "3. Submit your claim with your name, contact details and ownership evidence.\n" +
          "4. Wait for staff verification.\n" +
          "5. After verification, coordinate the handover with staff.\n\n" +
          "Please provide accurate ownership evidence.",
      });
    }

    if (
      userMessage.includes("how does") ||
      userMessage.includes("how it works") ||
      userMessage.includes("what is campusloop")
    ) {
      return res.json({
        reply:
          "CampusLoop is a college Lost and Found platform. Students can report lost or found belongings, browse reports, identify possible matches and submit claims. Staff can verify claims and manage the handover process.",
      });
    }

    if (userMessage.includes("thank") || userMessage.includes("thanks")) {
      return res.json({
        reply:
          "You're welcome! I'm happy to help. Let me know if you need help finding an item on CampusLoop.",
      });
    }

    // ---------------------------------------------
    // SEARCH MONGODB REPORTS
    // ---------------------------------------------

    const allItems = await Item.find()
      .select("title description category location type status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    if (allItems.length === 0) {
      return res.json({
        reply:
          "There are currently no reports in the CampusLoop database. You can create a Lost or Found report to get started.",
      });
    }

    // Decide whether the student is asking about Lost or Found.
    const asksLost =
      userMessage.includes("lost item") ||
      userMessage.includes("lost report") ||
      userMessage.includes("show lost") ||
      userMessage.includes("my lost");

    const asksFound =
      userMessage.includes("found item") ||
      userMessage.includes("found report") ||
      userMessage.includes("show found") ||
      userMessage.includes("where was") ||
      userMessage.includes("where is");

    // If a student says "I lost my wallet", search active Found reports.
    // If they explicitly ask to see Lost reports, search Lost reports.
    let targetType = "Found";

    if (asksLost && !asksFound) {
      targetType = "Lost";
    }

    if (asksFound) {
      targetType = "Found";
    }

    const eligibleItems = allItems.filter((item) => {
      if (item.type !== targetType) return false;
      return item.status === "Active";
    });

    if (eligibleItems.length === 0) {
      return res.json({
        reply:
          targetType === "Found"
            ? "There are currently no active Found reports in CampusLoop. You can check again later or report your lost item."
            : "There are currently no active Lost reports in CampusLoop.",
      });
    }

    // ---------------------------------------------
    // MATCH AND RANK REPORTS
    // ---------------------------------------------

    const rankedItems = eligibleItems
      .map((item) => ({
        item,
        score: calculateSearchScore(message, item),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);

    if (rankedItems.length === 0) {
      return res.json({
        reply:
          targetType === "Found"
            ? "I couldn't find a matching active Found report for your description. Try including the item's colour, name, category or the place where you lost it."
            : "I couldn't find a matching active Lost report. Try searching with another description or location.",
      });
    }

    // Show up to five possible matches.
    const matches = rankedItems.slice(0, 5);

    const heading =
      targetType === "Found"
        ? "Here are the possible Found item matches from CampusLoop:"
        : "Here are the matching Lost reports from CampusLoop:";

    const matchDetails = matches.map((result, index) => {
      const item = result.item;

      const date = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString("en-IN")
        : "Not available";

      return (
        `\n\n${index + 1}. ${item.title}` +
        `\nCategory: ${item.category}` +
        `\nDescription: ${item.description}` +
        `\nLocation: ${item.location}` +
        `\nStatus: ${item.status}` +
        `\nReported date: ${date}`
      );
    });

    let reply = heading + matchDetails.join("");

    if (targetType === "Found") {
      reply +=
        "\n\nThese are possible matches, not confirmed ownership. Please submit a claim with ownership evidence and wait for staff verification.";
    }

    return res.json({ reply });
  } catch (error) {
    console.error("CampusLoop chatbot error:", error);

    return res.status(500).json({
      reply:
        "Something went wrong while searching CampusLoop reports. Please try again.",
    });
  }
});

// =====================================================
// GET ALL ITEMS WITH EXISTING AI SEMANTIC MATCHING
// =====================================================

app.get("/api/items", async (req, res) => {
  try {
    const allItems = await Item.find().sort({ createdAt: -1 });

    const activeFoundItems = allItems.filter(
      (item) => item.type === "Found" && item.status === "Active",
    );

    const results = [];

    for (const item of allItems) {
      const data = item.toObject();

      if (item.type === "Lost" && item.status === "Active") {
        const matches = [];

        for (const found of activeFoundItems) {
          try {
            const similarity = await getSemanticSimilarity(item, found);

            if (similarity >= 55) {
              matches.push({
                ...found.toObject(),
                aiSimilarity: similarity,
              });
            }
          } catch (aiError) {
            console.error("AI matching error:", aiError.message);
          }
        }

        data.possibleMatches = matches
          .sort((a, b) => b.aiSimilarity - a.aiSimilarity)
          .slice(0, 5);
      }

      results.push(data);
    }

    res.json(results);
  } catch (error) {
    console.error("Get items error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// GET CLAIMS
// =====================================================

app.get("/api/claims", async (req, res) => {
  try {
    const claims = await Item.find({
      type: "Found",
      status: {
        $in: ["Claim Pending", "Matched", "Returned"],
      },
    }).sort({ updatedAt: -1 });

    res.json(claims);
  } catch (error) {
    console.error("Get claims error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// CREATE LOST / FOUND ITEM
// =====================================================

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

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// SUBMIT CLAIM
// =====================================================

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
      return res.status(404).json({
        message: "Found report not found.",
      });
    }

    if (found.status !== "Active") {
      return res.status(409).json({
        message: "This Found report is no longer active.",
      });
    }

    let lost = null;

    if (lostItemId) {
      if (!mongoose.isValidObjectId(lostItemId)) {
        return res.status(400).json({
          message: "Invalid Lost report ID.",
        });
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

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// APPROVE CLAIM
// =====================================================

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
      return res.status(404).json({
        message: "Found report not found.",
      });
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

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// RETURN ITEM
// =====================================================

app.patch("/api/items/:id/return", async (req, res) => {
  try {
    const found = await Item.findById(req.params.id);

    if (!found || found.type !== "Found") {
      return res.status(404).json({
        message: "Found report not found.",
      });
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

      if (lost) {
        found.matchedItemId = lost._id;
      }

      await found.save();
    } catch (saveError) {
      if (lostWasSaved) {
        await Item.updateOne(
          { _id: lost._id },
          {
            $set: {
              status: "Matched",
              returnedAt: null,
            },
          },
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

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// DELETE ITEM
// =====================================================

app.delete("/api/items/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Report not found.",
      });
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

      const firstDeleted = await Item.deleteOne({
        _id: item._id,
      });

      if (!firstDeleted.deletedCount) {
        return res.status(500).json({
          message: "Could not delete the selected report.",
        });
      }

      try {
        const secondDeleted = await Item.deleteOne({
          _id: linked._id,
        });

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

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// CONNECT TO MONGODB
// =====================================================

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
