import * as tf from "@tensorflow/tfjs";
import type { UniversalSentenceEncoder } from "@tensorflow-models/universal-sentence-encoder";

let modelPromise: Promise<UniversalSentenceEncoder> | null = null;

async function ensureTensorflowBackend() {
  await tf.ready();

  if (tf.getBackend()) {
    return;
  }

  try {
    await tf.setBackend("webgl");
  } catch {
    await tf.setBackend("cpu");
  }

  await tf.ready();
}

export function loadUniversalSentenceEncoder() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await ensureTensorflowBackend();
      const useModel = await import(
        "@tensorflow-models/universal-sentence-encoder"
      );
      return useModel.load();
    })().catch((error) => {
      modelPromise = null;
      throw error;
    });
  }

  return modelPromise;
}
