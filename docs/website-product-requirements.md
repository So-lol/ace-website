# Website Product Requirements

This document turns the initial ACE website PRD draft into repository documentation for the Vietnamese Student Association of Minnesota (VSAM) Anh Chi Em (ACE) mentorship and family program at the University of Minnesota.

## Overview

The website digitizes ACE program operations for pairing mentors (`anh/chi`) with up to two mentees (`em`) inside uniquely named families. It supports weekly photo submissions, bonus activities, public leaderboards, announcements, and admin oversight for points integrity.

## Objectives

- Streamline ACE program operations end to end
- Automate family and pairing management through CSV import and export
- Keep public, registered-user, and admin access boundaries explicit
- Support weekly submissions, bonus activities, and transparent point handling
- Preserve auditability for submissions, approvals, and point changes
- Deliver a responsive Doraemon-inspired experience

## Roles And Access

### Public

- Can view published announcements
- Can view public leaderboards
- Cannot submit photos
- Cannot view rosters, private submissions, or audit history

### Registered Participants

Registered participants include mentors and mentees.

- Can sign in and submit weekly photos for their own pairing
- Can select currently active bonus activities during submission
- Can view their own submission history, status, awarded points, and rejection reasons
- Can view public leaderboards and announcements
- Cannot edit families, pairings, announcements, bonuses, or global points

### Admin

- Can access the full admin panel after authentication
- Can create, edit, archive, and review families
- Can manage users, roles, pairings, and family assignments
- Can import and export CSV data
- Can create and publish announcements
- Can create and manage bonus activities
- Can review submissions and approve or reject them
- Can adjust, revoke, or override points with required justification
- Can review the audit log for all point-affecting and structure-changing actions

## Core Product Areas

### Public Site

- Leaderboards for top pairings and top families
- Filtering by week or season when applicable
- Published announcements feed
- Program information explaining family structure, submissions, bonus activities, and scoring

### Participant Experience

- Authenticated submission flow for weekly photo uploads
- Automatic pairing and family association based on the signed-in user
- Dynamic bonus selection based on the current admin-defined bonus set
- Submission tracking page showing pending, approved, and rejected items

### Admin Panel

- Dashboard with pending submissions, recent point activity, active bonuses, and announcements
- Family and pairing management
- User role management
- CSV import and export workflows
- Bonus and announcement management
- Submission review queue
- Points administration
- Audit log access
- Media review and retention controls

## Admin Workflows

### CSV Import

Admins can upload ACE application data or existing family structure CSVs. The system must:

- Validate required columns and row-level data
- Show a preview before commit
- Detect duplicate users and pairings
- Offer conservative conflict handling such as skip, merge, or replace
- Support idempotent import matching to avoid duplicate records
- Produce a downloadable error report when validation fails

### Family And Pair Management

Admins can:

- Create, edit, archive, and review families
- Enforce unique family names
- Assign participants to families and roles
- Link one mentor to up to two mentees
- Move users between families with audit logging
- Detect and resolve broken or mismatched family and pairing relationships

### Bonus Setup

Admins can define weekly or date-bound bonus activities with:

- Display name
- Point value
- Active window or week identifier
- Eligibility rules
- Visibility on the participant submission form

### Submission Review

Admins review weekly photo submissions in a queue and can:

- Inspect images and metadata
- Detect duplicates or invalid files
- Approve or reject submissions
- Provide a required rejection reason
- Bulk review submissions when appropriate
- Trigger point recalculation and leaderboard updates after decisions

## Participant Workflows

### Weekly Submission

1. A participant signs in.
2. The participant opens the weekly submission form.
3. The participant uploads photo evidence.
4. The participant selects any eligible bonus activities.
5. The system records the submission as pending.
6. The participant can later review its status and awarded points.

### Viewing Results

Participants and public visitors can:

- View leaderboards
- View published announcements

Participants can also:

- View only their own submissions and outcomes
- See rejection reasons when applicable

## Data Model Expectations

### Users

- Each participant must have a stable unique identifier such as email or university ID
- User records link to roles, pairings, and family membership

### Families

- Family names must be unique
- Family points are derived from pairing totals unless an admin override is explicitly applied

### Pairings

- Each pairing contains one mentor and up to two mentees
- Each pairing belongs to one family at a time
- Pairing points come from approved submissions plus approved manual adjustments

### Bonus Activities

- Bonuses are defined by admins and tied to a week or date range
- Only active bonuses should appear on the submission form

### Submissions

Each submission stores:

- Uploaded image file reference
- Submitter
- Pairing
- Family
- Week identifier
- Submission timestamp
- Selected bonus activities
- Review status
- Reviewer and decision timestamp
- Points awarded

### Audit Log

The audit log must be append-only and capture:

- Imports
- Family and pairing changes
- Submission approvals and rejections
- Point adjustments
- Actor identity
- Timestamp
- Before and after values when applicable
- Required reason fields for manual changes

## Validation And Integrity Rules

- Role-based authorization must gate every protected action
- Only admins can perform structure-changing or point-changing operations
- Duplicate submission prevention should default to one counted submission per pairing per week unless policy changes
- Unsupported image types and oversized files must be rejected with clear guidance
- Only approved submissions contribute to points
- Family totals must equal the sum of included pairing totals
- All manual point changes require a justification
- Leaderboards must refresh after approvals or point adjustments

## Error Handling

The product should fail explicitly and preserve integrity.

- Invalid CSV uploads must surface missing columns, row errors, and downloadable reports
- Duplicate imports must prompt conservative conflict resolution
- Invalid uploads must not create hidden partial records
- Unauthorized access must redirect or deny without leaking protected data
- Rejected submissions must include a visible reason for the participant
- Storage or processing failures must return actionable messages and avoid silent partial writes

## Integration Behavior

- Published announcements appear immediately on the public announcements page
- Admin-configured bonus activities control which bonus options participants can select
- Approved submissions feed the points system
- Leaderboards update automatically after review outcomes and manual point changes
- Every approval, rejection, import, and points change produces a corresponding audit event

## Non-Functional Requirements

- Responsive design across mobile and desktop
- Doraemon-inspired theme without sacrificing readability or accessibility
- Fast leaderboard and dashboard rendering under expected campus traffic
- Storage and metadata handling that can support hundreds to thousands of submissions
- Safe archival of old weeks or seasons without breaking historical standings
- Clear recovery behavior for partial operational failures
- Least-privilege security and protection against client-side tampering
- Maintainable separation between public, participant, and admin concerns

## Open Questions

These items still need confirmation before implementation is considered final:

- Participant authentication method: UMN SSO, email magic link, or program-managed accounts
- Exact submission rule: one submission per pairing per week, or multiple uploads with only one counted
- Base points and bonus caps by week, pairing, or family
- Whether family membership or pairings can change mid-season and how history should be preserved
- Whether registered users should see family rosters or only their own submissions plus public pages
