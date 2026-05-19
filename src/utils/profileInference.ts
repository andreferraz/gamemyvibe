import * as tf from "@tensorflow/tfjs";

export interface WeightedProfileState {
  sumVector: number[];
  profileVector: number[];
  weightMagnitude: number;
}

interface RankedCandidate<T> {
  item: T;
  embedding: number[];
}

export interface RankedResult<T> {
  item: T;
  similarity: number;
}

export function applyWeightedPreference(
  currentSumVector: number[] | null,
  currentWeightMagnitude: number,
  embedding: number[],
  weight: number,
): WeightedProfileState {
  return tf.tidy(() => {
    const embeddingTensor = tf.tensor1d(embedding);
    const weightedEmbedding = embeddingTensor.mul(weight);
    const currentSumTensor = currentSumVector
      ? tf.tensor1d(currentSumVector)
      : tf.zerosLike(weightedEmbedding);
    const nextSumTensor = currentSumTensor.add(weightedEmbedding);
    const nextWeightMagnitude = currentWeightMagnitude + Math.abs(weight);
    const nextProfileTensor =
      nextWeightMagnitude > 0
        ? nextSumTensor.div(nextWeightMagnitude)
        : tf.zerosLike(nextSumTensor);

    return {
      sumVector: nextSumTensor.arraySync() as number[],
      profileVector: nextProfileTensor.arraySync() as number[],
      weightMagnitude: nextWeightMagnitude,
    };
  });
}

export function rankByCosineSimilarity<T>(
  profileVector: number[],
  candidates: RankedCandidate<T>[],
  limit = 8,
): RankedResult<T>[] {
  if (profileVector.length === 0 || candidates.length === 0 || limit <= 0) {
    return [];
  }

  const cosineScores = tf.tidy(() => {
    const candidateTensor = tf.tensor2d(
      candidates.map((candidate) => candidate.embedding),
    );
    const profileTensor = tf.tensor1d(profileVector);
    const profileNorm = profileTensor.norm();
    const candidateNorms = candidateTensor.norm("euclidean", 1);
    const dotProducts = candidateTensor
      .matMul(profileTensor.expandDims(1))
      .squeeze();
    const denominator = candidateNorms.mul(profileNorm).add(tf.scalar(1e-8));
    const cosineTensor = dotProducts.div(denominator);

    return cosineTensor.arraySync() as number[];
  });

  // Interpret cosine logits as a preference distribution to expose per-item
  // recommendation confidence in percentage form.
  const maxCosine = Math.max(...cosineScores);
  const expScores = cosineScores.map((score) => Math.exp(score - maxCosine));
  const expSum = expScores.reduce((sum, score) => sum + score, 0);

  return candidates
    .map((candidate, index) => ({
      item: candidate.item,
      cosineScore: cosineScores[index],
      similarity:
        expSum > 0 ? Math.round((expScores[index] / expSum) * 100) : 0,
    }))
    .sort((left, right) => right.cosineScore - left.cosineScore)
    .slice(0, limit)
    .map(({ item, similarity }) => ({
      item,
      similarity,
    }));
}
