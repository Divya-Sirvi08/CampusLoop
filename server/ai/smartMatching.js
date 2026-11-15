const MODEL_NAME = "onnx-community/all-MiniLM-L6-v2-ONNX";

let extractorPromise = null;

// Store embeddings so we don't repeatedly process the same report.
const embeddingCache = new Map();
const MAX_CACHE_SIZE = 300;

// Load the AI model only once.
async function loadModel() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      console.log("Loading CampusLoop AI matching model...");

      const { pipeline } = await import("@huggingface/transformers");

      const extractor = await pipeline("feature-extraction", MODEL_NAME);

      console.log("CampusLoop AI model loaded successfully!");

      return extractor;
    })().catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }

  return extractorPromise;
}

// Convert an item description into a numerical embedding.
async function getEmbedding(item) {
  const text = [
    `Item: ${item.title || ""}`,
    `Description: ${item.description || ""}`,
    `Category: ${item.category || ""}`,
  ].join(". ");

  const cacheKey = text.toLowerCase().trim();

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }

  const extractor = await loadModel();

  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data);

  // Keep cache size under control.
  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = embeddingCache.keys().next().value;
    embeddingCache.delete(oldestKey);
  }

  embeddingCache.set(cacheKey, embedding);

  return embedding;
}

// Calculate cosine similarity between two embeddings.
function cosineSimilarity(vectorA, vectorB) {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Embedding dimensions do not match.");
  }

  let dotProduct = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
  }

  return Math.max(-1, Math.min(1, dotProduct));
}

// Compare two item reports using AI.
async function getSemanticSimilarity(itemA, itemB) {
  const [embeddingA, embeddingB] = await Promise.all([
    getEmbedding(itemA),
    getEmbedding(itemB),
  ]);

  const similarity = cosineSimilarity(embeddingA, embeddingB);

  return Math.round(similarity * 10000) / 100;
}

module.exports = {
  getSemanticSimilarity,
};
