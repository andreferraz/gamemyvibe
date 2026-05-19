import * as tf from "@tensorflow/tfjs";

export interface WeightedProfileState {
  sumVector: number[];
  profileVector: number[];
  weightMagnitude: number;
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
