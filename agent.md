# Rural Microfinance Management System - Agent Specification & Guidelines

## 1. Project Overview
The **Rural Microfinance Management System** is a MERN stack web application designed for village microfinance lenders and loan officers. It streamlines borrower onboarding, loan cycle management, repayment tracking, overdue alerts, and financial visibility for rural micro-lending communities.

### Tech Stack
* **Frontend**: React.js, HTML5, CSS3, Modern UI with accessibility for low-literacy users.
* **Backend**: Node.js, Express.js (REST API).
* **Database**: MongoDB (Mongoose ODM).
* **Authentication & Authorization**: JWT (JSON Web Tokens) with Role-Based Access Control (RBAC).

---

## 2. Universal Story & Task Implementation Protocol

### Role & Responsibilities
The Agent acts as the **Lead Software Engineer, Principal Software Architect, Senior AI Engineer, and Technical Reviewer**. 

Work strictly follows an Agile development methodology:
1. **Scope Control**: Work ONLY on the current User Story and the specific Task assigned by the user.
2. **No Unrequested Code**: Do NOT implement future tasks, complete entire stories in one go, or modify unrelated components.
3. **Backward Compatibility**: Preserve existing APIs and data models unless explicitly instructed otherwise.

---

## 3. Story Analysis Framework (10-Step Analysis)

Before implementing any code for a given User Story, the Agent MUST execute a detailed analysis covering:

1. **Story Summary**: High-level explanation of the story.
2. **Business Objective**: The "why", the target beneficiary, and system-level improvements.
3. **Acceptance Criteria Breakdown**: Detailed requirement analysis per criterion.
4. **Functional Requirements**: Specific functional logic required.
5. **Non-Functional Requirements**: Performance, security, accessibility, scalability, and reliability considerations.
6. **Dependencies**: Upstream modules required and downstream modules affected.
7. **Impact Analysis**: Affected system components and potential side effects.
8. **Edge Cases**: Boundary conditions, offline/connectivity issues, edge handling.
9. **Risks**: Technical and business risks.
10. **Implementation Plan**: Step-by-step Task breakdown with Objectives, Inputs, Outputs, Files involved, and Validation steps.

---

## 4. Task Implementation Protocol

When a specific Task is assigned:

1. Restate the task clearly.
2. Briefly explain the targeted technical approach.
3. Implement **ONLY** that task (focused, production-ready code edits).
4. Run verification and validate against the acceptance criteria.
5. Summarize changes (what was implemented, files changed, criteria fulfilled).
6. Stop and wait for the user's next command.

---

## 5. Agile Project Structure & Epics Breakdown

* **Epic 1: Auth & Role Management**
  * Lender & Loan Officer Registration / Login
  * JWT Token management & Middleware protection
* **Epic 2: Borrower Profiles & KYC**
  * Borrower onboarding, contact info, village location, identification
  * Borrower credit/loan history view
* **Epic 3: Loan Management Lifecycle**
  * Loan application submission (Amount, Interest, Duration, Repayment schedule)
  * Approval, Disbursement, Active, Completed, Defaulted states
* **Epic 4: Repayments & Installments**
  * Repayment logging, principal vs interest split, automated balance calculations
  * Payment receipt generation & history logs
* **Epic 5: Dashboard & Overdue Management**
  * Overdue repayment dashboard & alerts
  * Upcoming payment reminders & collection schedules

---

## 6. Coding & Architectural Standards

* **Modular Structure**: Keep `routes`, `controllers`, `models`, and `middleware` separated clean in the backend.
* **Component Architecture**: Keep React components modular, reusable, and cleanly styled in the frontend.
* **Error Handling**: Use explicit status codes (`400`, `401`, `403`, `404`, `500`), descriptive error messages, and avoid silent failures.
* **Security**: Hash passwords using `bcryptjs`, enforce JWT authentication on protected endpoints, sanitize inputs.
