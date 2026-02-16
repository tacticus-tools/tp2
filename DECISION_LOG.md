# Decision Log

## Table of Contents

<!-- TOC start (generated with https://github.com/derlin/bitdowntoc) -->

- [Purpose](#purpose)
- [Template](#template)
- [Decisions](#decisions)
   * [Decision: Start a new repository for the planner](#decision-start-a-new-repository-for-the-planner)
   * [Decision: Start the new repository from scratch](#decision-start-the-new-repository-from-scratch)
   * [Decision: Backend in Convex](#decision-backend-in-convex)
   * [Decision: Tanstack Start for the frontend framework](#decision-tanstack-start-for-the-frontend-framework)
   * [Decision: Use SPA (single-page application) instead of SSR (server-side rendering)](#decision-use-spa-single-page-application-instead-of-ssr-server-side-rendering)
   * [Decision: Use TypeScript](#decision-use-typescript)
   * [Decision: Hosting on Cloudflare](#decision-hosting-on-cloudflare)
   * [Decision: Use Bun instead of Node/NPM/Yarn/PNPM...](#decision-use-bun-instead-of-nodenpmyarnpnpm)
   * [Decision: Use Tailwind for styling](#decision-use-tailwind-for-styling)
   * [Decision: Biome as the code formatter and linter](#decision-biome-as-the-code-formatter-and-linter)
   * [Decision: Use React Query for data fetching and caching](#decision-use-react-query-for-data-fetching-and-caching)
   * [Decision: Use Zod for schema validation and type inference](#decision-use-zod-for-schema-validation-and-type-inference)
   * [Decision: Use Tanstack Form for form management](#decision-use-tanstack-form-for-form-management)
   * [Decision: GitHub Actions for CI/CD](#decision-github-actions-for-cicd)
   * [Decision: Use Playwright for end-to-end testing](#decision-use-playwright-for-end-to-end-testing)
   * [Decision: Use shadcn/ui for UI components](#decision-use-shadcnui-for-ui-components)
   * [Decision: Use Zustand for state management](#decision-use-zustand-for-state-management)
   * [Decision: Use FSD-ish file structure](#decision-use-fsd-ish-file-structure)
   * [Decision: Use PostHog for error monitoring](#decision-use-posthog-for-error-monitoring)
   * [Decision: Use Vitest as the unit testing tool](#decision-use-vitest-as-the-unit-testing-tool)
   * [Decision: Use Tanstack Table for tables](#decision-use-tanstack-table-for-tables)
   * [Decision: Use Zod + `json2const` for JSON type safety](#decision-use-zod-json2const-for-json-type-safety)

<!-- TOC end -->

<!-- TOC --><a name="purpose"></a>
## Purpose

> “Do not remove a fence until you know why it was put up in the first place.”
> - The Lesson of Chesterton's Fence

It's a lot scarier to change code when you don't know why it was written the way it was.

This log is meant to capture the rationale behind major decisions made in the codebase,
so that future developers (including future me) can understand what we were thinking
and decide whether it still applies.

If your reasoning comes down to "personal preference", that's totally fine — just write that down.
The important thing is to capture the reasoning, not to justify it as correct or objective.
That way we know how much weight to give it when circumstances change.

<!-- TOC --><a name="template"></a>
## Template

See below for the template. Don't bother with date & author since git will handle that.

```md
### Decision: [Short description of the decision]

- **Motivation**: [What problem were we trying to solve?]
- **Alternatives considered**: [What other options did we consider, and why did we reject them?]
- **Chosen solution**: [What did we decide to do, and why?]
- [Optional] **Rationale**: [Any additional context or reasoning that might be helpful for future developers to understand the decision.]
```

<!-- TOC --><a name="decisions"></a>
## Decisions

<!-- TOC --><a name="decision-start-a-new-repository-for-the-planner"></a>
### Decision: Start a new repository for the planner

- **Motivation**: The original project was under a developer account who no longer participated in the project. This limited our ability to manage the project.
- **Alternatives considered**:
  - 1) Continue using the existing repository, but with limited access.
  - 2) Fork the existing repository to a new organization account and continue development there.
  - 3) Start a new repository from scratch and migrate the code over.
- **Chosen solution**: We chose to start a new repository from scratch and migrate the code over. This allowed us to regain group control over the project and the backend.

<!-- TOC --><a name="decision-start-the-new-repository-from-scratch"></a>
### Decision: Start the new repository from scratch

- **Motivation**: We had a lot of ideas on ways to improve the codebase, but we didn't have access to the backend to make a lot of those changes.
- **Alternatives considered**:
  - 1) Fork the existing repository and make improvements there.
  - 2) Start a new repository from scratch and migrate the code over as needed.
- **Chosen solution**: Start from scratch. There were so many foundational changes that we figured it'd be easier to just start fresh and migrate over the code as needed, rather than trying to make a bunch of changes on top of the existing codebase.

<!-- TOC --><a name="decision-backend-in-convex"></a>
### Decision: Backend in Convex

- **Motivation**: We wanted a backend that was easy to set up and maintain, and that would allow us to focus on building the planner rather than managing infrastructure.
- **Alternatives considered**:
  - 1) Build our own backend using a traditional server and database.
  - 2) Use a Backend-as-a-Service (BaaS) platform like Firebase or Supabase.
  - 3) Use a serverless platform like AWS Lambda or Google Cloud Functions.
  - 4) Use a specialized backend platform like Convex.
- **Chosen solution**: Convex.
- **Rationale**:
  - Convex is purpose-built to be a backend for reactive frontends, so it automatically provides real-time updates and data management.
  - It's true "infrastructure as code". The actual TypeScript server code and schemas are defined in the codebase, so there's no hidden structure for new contributors to learn. This makes it especially good for LLM-assisted development, since the full context is in the repo.
  - Provides end-to-end type safety, which is great for catching bugs early and keeping LLMs from hallucinating calls to non-existent functions or fields.
  - Great free tier!
  
  ### Decision: Frontend in React
  
- **Motivation**: We wanted a frontend that was easy to build and maintain.
- **Alternatives considered**: None, to be honest.
- **Chosen solution**: React. The previous frontend was in React and we wanted to be able to reuse the code and experience we had from it.

<!-- TOC --><a name="decision-tanstack-start-for-the-frontend-framework"></a>
### Decision: Tanstack Start for the frontend framework

- **Motivation**: I wanted a framework that would provide a solid structure for the frontend to help keep it organized and maintainable as it grows.
- **Alternatives considered**:
  - 1) No framework, just React. "You're either using a framework or you're building one." I don't want to build a framework for a hobby project.
  - 2) Next.js - Popular but locks us into Vercel and server-side rendering, increasing running costs.
  - 3) Remix - I have no experience with it and it is moving away from React.
  - 4) Tanstack Start - Provides a solid structure for the frontend but keeps most of the traditional React flexibility. Downside is that it is still very new (in RC while I'm writing this), so there may be some growing pains and rough edges.
- **Chosen solution**: Tanstack Start. Tanner makes great tools and I trust that he'll iterate quickly on any issues that come up. I have some experience with TanStack Router (which it is based on) and it completely changed how I think about routing. There'll be a learning curve for people new to it but I'm happy to provide support and documentation to help with that.

<!-- TOC --><a name="decision-use-spa-single-page-application-instead-of-ssr-server-side-rendering"></a>
### Decision: Use SPA (single-page application) instead of SSR (server-side rendering)

- **Motivation**: React has a bunch of different rendering models these days.
- **Alternatives considered**:
  - SPA: Single-page application. The entire frontend is a single HTML page that is rendered on the client side. This is the traditional way of building React apps.
  - SSR: Server-side rendering. The frontend is rendered on the server and sent to the client as HTML. This can be good for SEO and initial load performance, but it can be more complex to set up and maintain.
  - ISR: Incremental Static Regeneration. A hybrid approach where pages are statically generated at build time, but can be re-generated on demand when data changes. Good for content-heavy sites that don't change often, but can be more complex to set up and maintain.
  - Hybrid: Some frameworks allow choosing the rendering model on a per-page basis. Good for optimization but adds complexity and can lead to inconsistent patterns across the codebase.
- **Chosen solution**: SPA mode but with build-time prerendering. Some of the pages in the app are pretty static (like campaign info pages), so we can prerender those into HTML at build time for better performance. The rest of the app is pretty dynamic and user-specific, so it makes more sense to render it on the client side. Tanstack Start handles this without a bunch of extra configuration, so it seemed like the best choice for our use case. It's also the cheapest to host since we're just serving static files.

<!-- TOC --><a name="decision-use-typescript"></a>
### Decision: Use TypeScript

- **Motivation**: Because vanilla JS is a bottomless pit of pain.
- **Alternatives considered**: Lol no.
- **Chosen solution**: TypeScript

<!-- TOC --><a name="decision-hosting-on-cloudflare"></a>
### Decision: Hosting on Cloudflare

- **Motivation**: We needed a hosting provider that was relatively easy to set up and maintain, but that wouldn't break the bank.
- **Alternatives considered**:
  - 1) Vercel - Great DX and generous free tier but can get expensive.
  - 2) Netlify - Similar to Vercel, though reviews aren't quite as good.
  - 3) Cloudflare - A bit more painful to set up but they have unlimited free hosting for static Cloudflare *Pages*, which is perfect for our frontend.
- **Chosen solution**: Cloudflare. Tanstack Start comes with the option of being preconfigured for Cloudflare *Workers*, so it was easy to start. The unlimited free hosting for static sites is appealing. At some point I'll have to figure out how to get us switched over from Cloudflare Workers to Cloudflare Pages. It'll be a bit of a faff but for now we can just focus on building the planner and worry about optimizing hosting once we are closer to launch.

<!-- TOC --><a name="decision-use-bun-instead-of-nodenpmyarnpnpm"></a>
### Decision: Use Bun instead of Node/NPM/Yarn/PNPM...

- **Motivation**: We need something to run the code...
- **Alternatives considered**:
  - 1) Node with NPM/Yarn/PNPM - The traditional choice, but much slower.
  - 2) Bun - A newer runtime that is designed to be a drop-in replacement for Node, but is much faster and has a lot of built-in features that would normally require separate packages (like a bundler, transpiler, etc).
- **Chosen solution**: Bun. The speed improvements are really nice, and I like having fewer moving parts to worry about. It's low risk since it's a drop-in replacement for Node.

<!-- TOC --><a name="decision-use-tailwind-for-styling"></a>
### Decision: Use Tailwind for styling

- **Motivation**: We need to style the website.
- **Alternatives considered**:
  - 1) Plain CSS - No build step but painful to maintain.
  - 2) CSS-in-JS (e.g. styled-components, emotion) - Keeps styles co-located with components, but you have to learn a whole new thing and it can lead to performance issues if not used carefully.
  - 3) Tailwind - Utility-first CSS framework that allows for rapid styling without leaving the HTML.
- **Chosen solution**: Tailwind. It has a bit of a learning curve but it's fast and the easiest to maintain. It's very popular, so it's supported by most tools and a lot of devs already know it. LLMs can work with it really easily since it's all in the HTML.

<!-- TOC --><a name="decision-biome-as-the-code-formatter-and-linter"></a>
### Decision: Biome as the code formatter and linter

- **Motivation**: We need a code formatter and linter to keep the code clean and consistent. This gets really important for an open-source project and when there are a lot of AI-generated code changes.
- **Alternatives considered**:
  - 1) Prettier + ESLint - The traditional choice, but requires a lot of configuration and can be slow.
  - 2) Biome - A newer tool that is designed to be a drop-in replacement for both Prettier and ESLint, but is much faster and has a lot of built-in rules that would normally require separate configuration. Written in Rust, by the way...
  - 3) Oxlint / Oxfmt - Similar to Biome and developed by the Vite team, but still in Alpha.
- **Chosen solution**: Biome + ESLint. Biome's speed is great, and I really dislike trying to configure ESLint and Prettier to work together without conflicts. It doesn't have the specialty plugins ESLint does though, so we'll use it for formatting and basic linting, but we'll still use ESLint for specialty rules (like the Convex plugin).

<!-- TOC --><a name="decision-use-react-query-for-data-fetching-and-caching"></a>
### Decision: Use React Query for data fetching and caching

- **Motivation**: We need a way to fetch and cache data from the backend, and to keep the UI in sync with the backend.
- **Alternatives considered**:
  - 1) `useContext` + `useEffect` - The most "basic" approach, but painfully difficult to get right. https://tkdodo.eu/blog/why-you-want-react-query
  - 2) RTK Query - Great for Redux users, but adds a lot of complexity if you're not already using Redux.
  - 3) React Query - Popular and easy to use. Built by the same team as Tanstack Start so they are designed to work together.
- **Chosen solution**: React Query.

<!-- TOC --><a name="decision-use-zod-for-schema-validation-and-type-inference"></a>
### Decision: Use Zod for schema validation and type inference

- **Motivation**: We need a way to validate user data and to keep our types in sync between the frontend and backend.
- **Alternatives considered**: None, to be honest. Zod is by far the most popular and what we have experience with. Plus it was in the template.
- **Chosen solution**: Zod.

<!-- TOC --><a name="decision-use-tanstack-form-for-form-management"></a>
### Decision: Use Tanstack Form for form management

- **Motivation**: We need a way to manage form state and validation, and to keep the UI in sync with the form state.
- **Alternatives considered**:
  - 1) `useState` + `useEffect` - The most basic approach but can get really messy and hard to manage as forms get more complex.
  - 2) React Hook Form - Popular and integrated with lots of component libraries.
  - 3) Tanstack Form - Built by the same team as Tanstack Start and React Query, so they are designed to work together. Has first-class support for TypeScript and Zod, which is great for our type-safe guardrails against rogue LLM-generated code.
- **Chosen solution**: Tanstack Form. It came with the Tanstack Start template and there's a lot of synergy between the Tanstack libraries, so it seemed like the natural choice.

<!-- TOC --><a name="decision-github-actions-for-cicd"></a>
### Decision: GitHub Actions for CI/CD

- **Motivation**: We need a way to automatically run tests and deploy the app.
- **Alternatives considered**: None really. Even though it's a comparatively bad product, it's built right into GitHub so it's the path of least resistance.
- **Chosen solution**: GitHub Actions + [Blacksmith.sh](https://blacksmith.sh) as the runner. This gets us the convenience of GitHub Actions but with much faster servers and better observability. We have to be mindful to not exceed the free tier limits.

<!-- TOC --><a name="decision-use-playwright-for-end-to-end-testing"></a>
### Decision: Use Playwright for end-to-end testing
  - **Motivation**: We need a way to test the app end-to-end (again, to keep the LLM-generated code in check).
  - **Alternatives considered**:
    - 1) Cypress - Popular and easy to use, but can be slow and flaky.
    - 2) Playwright - A newer tool that is designed to be faster and more reliable than Cypress. It also has great support for testing across multiple browsers and devices.
  - **Chosen solution**: Playwright. It has rapidly overtaken Cypress in popularity and user sentiment. I have plenty of experience with Cypress and I don't want any more.

<!-- TOC --><a name="decision-use-shadcnui-for-ui-components"></a>
### Decision: Use shadcn/ui for UI components

- **Motivation**: We need a way to build UI components quickly and consistently.
- **Alternatives considered**:
  - 1) Build our own component library from scratch - Yeah no. Ain't nobody got time for that.
  - 2) Use a pre-built component library like Material UI, Ant Design, or Chakra UI - The classic approach where you "npm install" your style system. Very easy to get started but an absolute nightmare to customize. You quickly lose all the time you saved up front.
  - 3) Headless Components libraries like Radix UI or Headless UI - These provide unstyled, accessible components that you can style yourself. This gives you the best of both worlds, but you still have to write a lot of CSS.
  - 4) shadcn/ui - A collection of pre-built components that are built on top of Radix UI and styled with Tailwind. Has a different install process where you "npx shadcn-ui add [component]" and it generates the component code directly in your codebase, which you can then customize as needed.
- **Chosen solution**: shadcn/ui. We get all the benefits of a pre-built component library but without the pain of customizing them.

<!-- TOC --><a name="decision-use-zustand-for-state-management"></a>
### Decision: Use Zustand for state management

- **Motivation**: We need a way to manage global state in the app.
- **Alternatives considered**:
  - 1) `useContext` + `useReducer` - The most basic approach but poor performance and is locked inside the React component tree.
  - 2) Jotai - A library that is very atomic in how it manages state. Built by the same people as Zustand. Great for very simple state but doesn't scale well as the state gets more complex.
  - 3) Zustand - A library that uses "stores" for state management. Takes some inspiration from Redux but with a much simpler API. Stores are defined outside of the React component tree, so they're much easier to work with in tests.
  - 4) Tanstack Store - A very new library from the Tanstack team that is designed to work seamlessly with their other libraries. First-class support for TypeScript and has a lot of built-in features for things like persistence and devtools. Still in alpha though.
- **Chosen solution**: Zustand. It was an option in the template and it's battle tested and popular. Maybe someday we'll go full Tanstack but right now I don't want to mess with an alpha tool.

<!-- TOC --><a name="decision-use-fsd-ish-file-structure"></a>
### Decision: Use FSD-ish file structure

- **Motivation**: We need a way to organize our files that is easy to understand and maintain.
- **Alternatives considered**:
  - 1) Feature-Sliced Design (FSD) - The previous version of the app was in the process of migrating to this. It's very formal, structured, and has associated tools. Good for large teams with full-time developers to learn and maintain the structure. Confusing overkill for a small team of part-time developers and open source contributors.
  - 2) Flat structure - Just throw all the files in a few folders. Easy to understand but can get really messy as the app grows.
  - 3) FSD-ish - A simplified version of FSD that takes some inspiration from it but is less formal and structured. We have a few top-level folders that begin with numbers to indicate their hierarchy. TL;DR: "Big number file no import small number file"
- **Chosen solution**: FSD-ish. We want some structure to keep things organized but without the overhead of full FSD. "Don't add a pattern until you can't stand the pain of not having it." If we need it later then we'll add it later.

<!-- TOC --><a name="decision-use-posthog-for-error-monitoring"></a>
### Decision: Use PostHog for error monitoring

- **Motivation**: Error monitoring is really helpful to get information about errors that user reports can't provide.
- **Alternatives considered**:
  - 1) Sentry - The common approach, but free tier is limited to one user.
  - 2) Rollbar - Similar to Sentry but with a more generous free tier. 5000 events/month and unlimited users.
  - 3) PostHog - Newer tool, originally focused only on analytics but has expanded to error monitoring. 100k events/month, unlimited users, 5000 replays, a crap-ton of analytics features, ...
- **Chosen solution**: PostHog. The free tier is 20x more generous than the other two and comes with all the analytics we could ever want. Plus their website is dope.

<!-- TOC --><a name="decision-use-vitest-as-the-unit-testing-tool"></a>
### Decision: Use Vitest as the unit testing tool

- **Motivation**: We need something to run unit tests.
- **Alternatives Considered**:
  - 1) Jest: The old standby. Built on webpack instead of Vite so we'd be managing a whole different build pipeline for tests.
  - 2) `bun test`: The built in test runner with `bun`. Super fast, but not popular yet and so it has compatibility issues.
  - 3) Vitest: Like Jest, but built on top of Vite so it's a unified pipeline.
- **Chosen solution**: Vitest. I tried `bun test` but there were too many things going wrong, so I kept it simple.

<!-- TOC --><a name="decision-use-tanstack-table-for-tables"></a>
### Decision: Use Tanstack Table for tables

- **Motivation**: We need tables. Vanilla HTML tables suck.
- **Alternatives Considered**:
  - 1) AgGrid - Used by the old planner. Really powerful but less flexible.
  - 2) Tanstack Table - Headless table library. Lets us style it however we want but requires more config.
- **Chosen solution**: Tanstack Table was available in the template. Stick with it until we need more.

<!-- TOC --><a name="decision-use-zod-json2const-for-json-type-safety"></a>
### Decision: Use Zod + `json2const` for JSON type safety

- **Motivation**: The data coming out of the app is usable but not ideal. We have to manually add types and manipulate it on the client to achieve type safety. This adds a lot of maintenance burden and room for mistakes.
- **Alternatives Considered**: Experiments I did on the previous project to handle it were:
  - 1) Use bash to copy the json files into `as const` TS objects. Simple but any form of data transformation is painful.
  - 2) Patch TypeScript to treat it as const. This gives it full type safety but is a heavy hit to tsc performance and makes the code really strict. It's also brittle against TypeScript version upgrades.
  - 3) Use Zod to parse + validate + transform the JSON in a Vite build plugin. This gives very good type safety and makes client code much simpler. Unfortunately it cannot give us things like type FactionId = 'Ultramarines' | 'Aeldari' | ...
- **Chosen solution**: I think the most sustainable solution here is a combination of experiments 3 and 1.
Use Zod for parsing and transforming the raw JSON into forms that are better for the client to work with. For critical types that change often (e.g. CharacterId, FactionId, NpcId, ...), we can have Zod dump them into JSON arrays and then use [`json2const`](https://www.npmjs.com/package/json2const) in the same build plugin to give us string union types.