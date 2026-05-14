# Security Model

This project should be read as a prototype with explicit security intent, not as proof of complete production hardening.

## Current Security Direction

- auth and RBAC modules on the backend
- frontend permission and auth guards
- approval-first handling for risky actions
- mock mode for safe demonstrations
- environment templates instead of committed credentials

## Production Gaps To Keep In Mind

- secrets should move to a real vault or managed secret platform
- transport security, tenant isolation, and audit depth need further hardening
- browser and tool execution need strict environment boundaries in real deployments
- connector and MCP access policies need stronger production controls

## Rule Of Thumb

This repo demonstrates governance-aware architecture. It does not claim full enterprise certification or real production adoption.
