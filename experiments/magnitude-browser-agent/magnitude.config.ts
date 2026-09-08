// Drop this into the project `npx create-magnitude-app` scaffolds for you,
// replacing its generated magnitude.config.ts. See README.md in this folder
// for why this config shape (gateway-routed, not a direct Anthropic key) is
// the thing actually worth testing.
//
// Uses your existing LITELLM_BASE_URL / LITELLM_MASTER_KEY from the main
// repo's .env — no new secret, consistent with the Bedrock portal
// consolidation in master plan 6.12/6.13. If visual grounding doesn't
// survive this route, switch to the commented fallback below and add
// ANTHROPIC_API_KEY to this folder's own .env.
//
// UNVERIFIED (the actual point of this spike): whether Magnitude's grounding
// behavior works correctly when Claude Sonnet is reached via
// Magnitude -> LiteLLM gateway (openai-generic) -> AWS Bedrock, vs. calling
// Anthropic directly. Test before relying on this in anything real.

import { type MagnitudeConfig } from 'magnitude-test';

export default {
    url: 'https://the-internet.herokuapp.com', // swap for whatever you're actually testing against
    llm: {
        provider: 'openai-generic',
        options: {
            baseUrl: process.env.LITELLM_BASE_URL,   // e.g. http://localhost:4000/v1
            model: 'premium',                          // tier alias — Claude Sonnet 4.5 via Bedrock, per gateway/config.yaml
            apiKey: process.env.LITELLM_MASTER_KEY,
        },

        // --- Fallback if the gateway route doesn't preserve grounding ---
        // provider: 'anthropic',
        // options: {
        //     apiKey: process.env.ANTHROPIC_API_KEY,
        //     model: 'claude-sonnet-4-5-20250929',
        // },
    },
} satisfies MagnitudeConfig;
