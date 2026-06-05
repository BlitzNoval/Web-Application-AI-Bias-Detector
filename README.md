# Overview

Skewed Lenses is a web-based tool that explores how different AI models can produce divergent, and sometimes contradictory, responses to the same prompt. Rather than presenting a single model output as a neutral representation of truth, the platform compares multiple models side by side, highlighting points of agreement, disagreement, framing differences, and variations in confidence.

The project is built around a simple question: *what happens when we stop treating AI outputs as objective answers and start examining them as interpretations?*

By making model disagreement visible, Skewed Lenses allows users to inspect how different systems construct responses from the same information, exposing the assumptions, biases, and perspectives embedded within contemporary AI models.

## Why This Matters

As AI systems become increasingly integrated into education, research, decision-making, and everyday information seeking, their outputs are often treated as authoritative. Yet capable models frequently generate responses that differ significantly in substance, framing, certainty, or recommendation despite receiving identical inputs.

These differences are usually hidden because users interact with only one model at a time.

Skewed Lenses treats disagreement as valuable information rather than noise. By surfacing it directly, the platform:

* Demonstrates that AI outputs are shaped by training data, model architecture, alignment choices, and embedded assumptions rather than reflecting a single objective truth.
* Encourages critical engagement and epistemic humility when interpreting AI-generated information.
* Provides researchers, students, and general users with a practical way to examine where and why AI systems diverge.

## Project Context

Skewed Lenses was developed as an Honours thesis project within the Digital Arts programme at the University of the Witwatersrand (Wits). The project was created in connection with research exploring AI interpretability, algorithmic bias, digital media, and the broader governance challenges that emerge when AI systems are treated as neutral or authoritative sources of knowledge.

## Live Demo

**Vercel Deployment:** https://skewed-lenses.vercel.app/

> **Note:** To protect API credentials, requests to Gemini, Claude, and Llama are routed through a server-side AI service rather than being made directly from the browser. The service is exposed via an ngrok tunnel during deployment, ensuring provider API keys remain secure and are never included in the client bundle.

Because responses depend on external AI providers and intermediary network routing, generation times and request success rates may vary depending on service availability, network conditions, and provider load.
