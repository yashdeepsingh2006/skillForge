---
name: docs
description: Master specification for software documentation practices across the SDLC (requirements, architecture, technical API, user manuals, and maintenance).
version: 1.0.0
---

# Software Documentation Guidelines & System Prompt

## Overview
This document serves as the master specification for software documentation practices, distilled from *Mastering the Art of Software Documentation* by Nayeem Islam. It guides developers, technical writers, and AI agents on producing clear, structured, and comprehensive documentation across the entire software development lifecycle (SDLC).

---

## 1. Core Documentation Categories
Every software project must maintain documentation across these 11 essential areas:

1. **Requirements Documentation**:
   - *User Requirements*: End-user needs, expectations, and problems solved.
   - *System Requirements*: Functional tasks/features and non-functional aspects (performance, security, scalability).
2. **Design Documentation**:
   - *Architectural Design*: High-level system structure, major modules, and interactions.
   - *Detailed Design*: In-depth component functions, interrelations, and technology/framework stacks.
3. **Technical Documentation**:
   - *API Documentation*: Functions, classes, methods, endpoints, parameters, and payloads.
   - *Database Documentation*: Schema, structures, and data relationships.
   - *Code Documentation*: Inline comments and internal logic explanations.
4. **User Documentation**:
   - *User Manuals*: Installation, configuration, and end-user navigation guides.
   - *Training Materials*: Tutorials, walkthroughs, and instructional videos.
5. **Testing Documentation**:
   - *Test Plans*: Strategy, scope, and testing approaches.
   - *Test Cases*: Specific execution scenarios and expected outcomes.
   - *Test Results*: Performance metrics and defect records.
6. **Project Documentation**:
   - *Project Plans*: Schedules, resource allocation, and milestones.
   - *Project Reports*: Periodic status updates and progress tracking.
7. **Maintenance Documentation**:
   - *Bug Reports*: Identified issues and resolutions.
   - *Change Logs*: Historical record of software modifications.
8. **Deployment Documentation**:
   - *Installation Guides*: Step-by-step setup instructions.
   - *Release Notes*: New features, improvements, and known limitations per release.
9. **Legal and Compliance Documentation**:
   - *License Agreements*: Terms of use.
   - *Compliance Documents*: Regulatory standards adherence.
10. **API Documentation (Specialized)**:
    - *Swagger/OpenAPI Specs*: RESTful endpoint declarations.
    - *SDK Documentation*: Software Development Kit integration guides.
11. **Security Documentation**:
    - *Security Policies*: Protective measures and protocols.
    - *Security Audits/Reports*: Assessment findings and integrity verification.

---

## 2. Best Practices for Effective Documentation
- **Prioritize Documentation**: Treat documentation as a first-class citizen alongside source code; never ship features without it.
- **Target Audience Alignment**: Tailor tone and depth depending on whether the reader is an end-user, developer, or stakeholder.
- **Clarity and Conciseness**: Avoid unnecessary technical jargon; write clearly and structurally.
- **Style Consistency**: Enforce a unified style guide for formatting, voice, terminology, and visual hierarchy.
- **Agile & DevOps Integration**: Keep documentation living and updated continuously within deployment/sprint cycles rather than as an afterthought.
- **Visual & Search Aids**: Utilize diagrams, screenshots, robust search functionality, and troubleshooting FAQs.