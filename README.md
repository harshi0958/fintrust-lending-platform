
Act as a senior GitHub profile designer and full-stack documentation engineer. Redesign my repository's `README.md` into a visually impressive, premium, recruiter-ready GitHub project showcase.

Repository: https://github.com/harshi0958/fintrust-lending-platform

Project name: **FinTrust — Lending Management Platform**

IMPORTANT: I do NOT want a plain text README with ordinary headings and bullet points. I want a polished, visually rich GitHub README with attractive HTML layout, tables, badges, diagrams, and well-designed sections.

## 1. Premium Hero Section
Create a centered HTML hero section using GitHub-compatible HTML:
- FinTrust project title with a professional finance/lending tagline.
- Short, powerful project description.
- Attractive shields.io badges for React, Node.js, Express, MongoDB, JavaScript, and repository status, but only include technologies confirmed in the repository.
- Clickable badges for GitHub repository and relevant sections.
- A clean visual divider below the hero.
- Use a premium fintech aesthetic: navy, blue, white, and subtle green accents. Do not use unsupported CSS or JavaScript.

## 2. Project Preview
Create a visually attractive overview section explaining the customer, loan manager, and admin experiences.
Use a clean HTML table or Markdown layout that GitHub renders correctly.
Add clearly labelled screenshot placeholders using relative paths such as `docs/screenshots/homepage.png` only as placeholders, and explain where screenshots should be added. Do not create fake screenshots or broken external image links.

## 3. Feature Showcase
Display implemented features in an organized HTML table with emoji icons, bold titles, and concise descriptions:
- Customer dashboard and loan application workflow.
- Document upload and verification.
- Loan manager application review and decisions.
- Admin dashboard and user management.
- Role-based access control.
- Application status tracking.

Verify each feature in the actual source code before describing it. If a feature is incomplete, label it accurately rather than pretending it works.

## 4. Technology Stack
Create a clean, professional technology table with technology names, purposes, and relevant official technology links. Inspect `package.json` files to identify the actual stack. Use shields.io badges where appropriate.

## 5. Architecture Diagram
Create a Mermaid flowchart illustrating the actual architecture:
Customer / Loan Manager / Admin → React Frontend → Express REST API → Authentication and Authorization → MongoDB/Mongoose.

Adjust the diagram to match the actual code. Use a clean, readable diagram with meaningful node labels.

## 6. Application Workflow
Create a professional Mermaid workflow diagram showing the actual loan lifecycle, from customer application through manager review, document verification, decision, and status tracking. Include only implemented workflow stages.

## 7. Project Structure
Display the actual important repository folders and files in a readable tree-style code block. Exclude `node_modules`, `.env`, private uploads, build output, and other generated files.

## 8. Quick Start
Create separate, clearly labelled setup sections for backend and frontend with copy-pasteable Windows PowerShell commands. Verify all commands against the repository's real scripts and configuration. Include safe `.env.example` templates only when the variable names are confirmed. Never reveal actual secrets.

## 9. API Overview
Present verified API route groups in a neat Markdown table with HTTP methods, endpoint paths, purpose, and authentication/role requirements wherever these are confirmed in the source.

## 10. Security and Engineering
Use a visually clear section to explain verified security controls, input validation, authentication, authorization, and upload protections. Separate existing controls from future recommendations.

## 11. Roadmap
Create a concise GitHub task-list roadmap with current limitations and possible future improvements. Do not mark unimplemented features as completed.

## 12. Developer Information
Include learning outcomes, contribution instructions, a note about licensing based on whether a LICENSE file exists, and the repository link. Do not invent a live demo URL.

## DESIGN RULES
- Use professional English throughout.
- Use HTML only for presentation that GitHub actually supports; no JavaScript, React components, or unsupported interactive elements.
- Make the layout look premium and carefully spaced.
- Avoid walls of text, generic descriptions, and excessive emojis.
- Use Markdown tables, HTML `<div align="center">`, `<p>`, `<img>`, `<details>`, and `<summary>` where appropriate.
- Keep badges consistent and relevant.
- Ensure Mermaid diagrams render on GitHub.
- Keep links valid and use relative image paths for future screenshots.
- Inspect the codebase first and document only real, implemented functionality.
- Do not modify application code or configuration files.

**Deliverable:** Replace the existing `README.md` directly with the finished premium version. Do not merely explain what should be written. Then summarize the visual improvements made.
