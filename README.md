# Skewed Lenses

Skewed Lenses is a web-based AI ethics and interpretability tool where neurodivergent individuals complete structured tasks, and the system analyses how consistently different AI models interpret patterns in their responses.

A single prompt is sent to four large language model APIs (OpenAI, Claude, Gemini, and Llama). Each model generates an independent response, and the system compares these outputs to identify divergence in reasoning, framing, confidence, and interpretation.

The platform optionally supports a multi-agent workflow where models respond to and refine each other’s outputs toward a shared outcome. All responses are visualised to highlight where models agree, disagree, or shift perspective, making inconsistency across systems explicit rather than hidden.

Built with React and a multi-agent LLM orchestration layer in Python, Skewed Lenses functions as both a research tool and an experimental interface for studying how AI systems construct meaning from identical inputs.

## Central Question

The central question guiding the project is:

What changes when AI outputs are treated as interpretations rather than objective answers, particularly when prompts reflect neurodivergent styles of thinking and expression?

By surfacing disagreement directly, the system exposes how different models encode assumptions, structure knowledge, and respond to variation in input style.

## Why This Matters

AI systems are increasingly used in education, research, decision-making, and everyday information access, yet their outputs are often treated as authoritative or neutral.

In practice, even state-of-the-art models frequently produce meaningfully different responses to the same prompt, varying in reasoning, tone, certainty, and structure. These differences become more pronounced when inputs reflect diverse cognitive styles, including neurodivergent patterns of communication and problem solving.

Because users typically interact with only one model at a time, this variation is usually invisible.

Skewed Lenses treats disagreement as meaningful signal rather than noise. By making it visible, the platform:

Shows that AI outputs are shaped by training data, architecture, alignment methods, and design choices rather than reflecting a single objective truth
Highlights how interpretation changes across differently structured or non-standard inputs
Encourages critical engagement with AI-generated information and supports epistemic humility
Provides a controlled environment for comparing model behaviour under identical conditions
Surfaces bias, uncertainty, and structural variation across leading language models

## Project Context

Skewed Lenses was developed as an Honours thesis project within the Digital Arts programme at the University of the Witwatersrand (Wits). It sits within research on AI interpretability, algorithmic bias, digital media theory, and the governance challenges that arise when language models are treated as neutral knowledge systems.

The project combines technical implementation with research-driven inquiry into how AI systems construct meaning, and how those constructions vary across architectures and input styles.

## Tech Stack

React (frontend)
Python (multi-agent orchestration layer)
OpenAI API
Anthropic Claude API
Google Gemini API
Meta Llama API

## Live Demo

https://skewed-lenses.vercel.app/

## Notes

> **Notes**
> To protect API credentials, requests to Gemini, Claude, and Llama are routed through a secure server-side orchestration layer rather than directly from the browser. This service is deployed via a controlled tunnel, ensuring API keys remain private and excluded from the client bundle.
>
> Because responses depend on external providers and network routing, latency and success rates may vary based on service availability, traffic, and model load.
