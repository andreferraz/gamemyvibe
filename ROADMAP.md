# MVP Roadmap (Steamder)

This app is an experimental, zero-infrastructure game recommendation platform that utilizes a real-time "Tinder-style" interface to dynamically map user preferences through local machine learning.

By presenting users with a sequential deck of popular games to rate—using simple interactions like "Amo," "Gosto," or "Não tenho interesse"—the frontend leverages TensorFlow.js and the Universal Sentence Encoder to instantly transform game descriptions into 512-dimensional semantic embeddings.

As the user interacts with the cards, the system performs client-side vector mathematics to calculate a weighted profile and instantly updates a side-by-side recommendation panel against a pool of 100 candidate games from the IGDB API, demonstrating real-time algorithmic adaptation with zero server processing costs and total data privacy.

## Phase 1: Backend & APIs (Next.js Routes)

1. [x] **Endpoint 1 (`/api/igdb/discovery`)**: Fetches a list of 10 most popular games (filtering for `total_rating_count > 150`, `summary != null`, and `cover != null`) to serve as immediate interaction "bait" for the user.
2. [] **Endpoint 2 (`/api/igdb/candidates`)**: Fetches a fixed pool of 100 highly popular games from the IGDB API, ordered by global popularity, which will serve as the base dataset for generating recommendations.

## Phase 2: Layout & User Interface (Frontend)

3. [] **Split-Screen Layout**: A simple side-by-side responsive grid.

- [] **Left Side**: The active discovery card displaying the game's title, cover art, a brief summary, and three action buttons ("Não tenho interesse", "Gosto", "Amo").
- [] **Right Side**: The Real-Time Recommendation Panel displaying a vertical list of the top 5 to 10 recommended games along with their similarity percentage scores.

4. [] **State Management**: A local React state array (`userPreferences`) to store the ID, description embedding, and mathematical weight of every game the user interacts with.

## Phase 3: The Embedded Engine (Local TensorFlow.js)

5. [] **Model Initialization**: Load the pre-trained `Universal Sentence Encoder` model asynchronously in the background as soon as the landing page mounts.
6. [] **Candidate Pre-Vectorization**: Immediately fetch the 100 candidate games upon page load and generate their semantic embeddings once, caching them in browser memory to eliminate redundant API calls or heavy recalculations during swiping.

## Phase 4: Real-Time Algorithmic Adaptation

7. [] **On-Click Inference**: Every time a user clicks "Gosto" ($+1.0$) or "Amo" ($+2.0$), trigger a client-side tensor operation to compute the new weighted average vector of the user's profile.
8. [] **Vector Subtraction**: If the user selects "Não tenho interesse", apply a negative scalar multiplication (e.g., $-1.5$) to that game's vector to mathematically shift the user's profile away from that specific semantic theme.
9. [] **Instant UI Refresh**: Execute a cosine similarity matrix operation between the updated profile vector and the pre-cached candidate embeddings, instantly re-sorting and animating the right-hand recommendation panel before advancing the left card.
