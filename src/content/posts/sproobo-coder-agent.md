---
title: "Sproobo's coder agent: from issue to merged PR without me"
date: 2026-11-07T22:00:00+01:00
number: 2
tags: [sproobo, ai, ci]
lang: en
description: "How I built an autonomous Claude agent loop for Sproobo on GitHub Actions: it picks an issue, writes the fix, survives CI and review, and merges, while the model never holds a write credential."
---

[Sproobo](https://sproobo.com) has one developer, and that is me. The issue tracker grows faster than I can close it, especially since an automated security scanner started filing findings. Most of them are small, well-described and boring: bound this field, refuse that input, hide this log line from a role that should not see it.

So this week I built agents that work the repository on their own. An issue goes in, and a merged pull request comes out. I don't touch it in between. This morning two of them merged without me.

This post is how it works. The short version is that the model is the least trusted part of the system.

## The loop

```text title="the-loop.txt"
issue
  |  triage, or me adding agent:ready
  v
agent:ready  (the queue)
  |  coder: one issue at a time, 2 runs a day
  v
pull request  <------------------+
  |                              |
  |  CI + Claude review          |  fixer: up to 2 CI fixes
  |                              |  and 1 review fix
  +-- red / changes requested ---+
  |
  |  green, Approve, up to date with main
  v
merge gate --> merged into main
  |
  v
agent:done-pending-deploy
  |  I deploy, check production, close the issue
  v
done
```

Everything runs on GitHub Actions with Anthropic's `claude-code-action`, on a dedicated Hetzner box registered as its own self-hosted runner pool. GitHub is the whole user interface. The state lives in issue labels, the queue is a label, and the audit trail is comments plus a ledger branch.

There are a handful of roles, each a workflow:

- **Triage** reads new security findings. A Low or Medium one filed by someone with write access goes straight into the queue. High and Critical ones wait for me.
- **Coder** takes the oldest ready issue, implements it and opens a PR.
- **Fixer** reacts to a red CI run or a review that asks for changes on an agent PR, and pushes a fix.
- **Merge gate** merges an agent PR when every condition holds.
- **Sweep** runs hourly. It frees stale locks and moves issues along when their PR merges or closes.
- **Digest** posts a weekly summary of what happened and what waits for me.

Only the coder and the fixer run a model, both Claude Opus. The review is the same Claude review every PR in the repository already gets. Everything else is shell scripts.

## Two rules

The design rests on two rules. Everything else follows from them.

**The agent proposes, a plain script acts.** The model never pushes, comments, labels or opens anything. It writes commits and a few files into an outbox directory. A deterministic shell script then validates those and performs every GitHub write. A prompt injection hidden in an issue can waste a run. It cannot publish anything.

**The model never holds a write credential.** The job the model runs in gets a token that can read repository contents and nothing else. It has no `gh` command at all. Its shell is limited to git, Go, pnpm and the test commands. The credential that can push is a GitHub App token, minted in a different job after the model has finished.

## One coder run

A coder run is three jobs. Each runs in its own throwaway container on the agent box.

```text title="one-coder-run.txt"
 preflight          code                publish
 (seconds)          (up to 45 min)      (seconds)
+--------------+   +---------------+   +---------------+
| kill switch, |   | Opus reads    |   | fresh main,   |
| breaker,     |-->| the task,     |-->| checks every  |
| daily caps;  |   | edits, tests, |   | commit and    |
| picks and    |   | commits       |   | path; pushes, |
| snapshots    |   | locally       |   | opens the PR  |
| the issue    |   |               |   |               |
+--------------+   +---------------+   +---------------+
 App token:         read-only token,    App token:
 labels, lock       no gh, no push      push, PR, labels
```

**Preflight** checks the kill switch, the circuit breaker and the daily limits. It picks an issue and locks it with a label and a comment. Then it reads the issue exactly once: the title, the body, and only the comments from people with write access. It wraps all of that as untrusted data for the model. Right after the read it checks again that nobody without write access edited the issue in the meantime.

**Code** is where Opus works. The prompt is a Claude Code slash command, `/agent-implement`, and it is mostly a list of things to check before deciding anything. Read the project's `CLAUDE.md`. Read the code the issue points at, because the scanner's commit may be older than `main`. Make the smallest change. Add a test that can actually fail. Run the same checks CI runs for every area you touched. Never weaken a test to get green.

The most useful line in that prompt is the one that lets the agent give up. If the fix needs a protected file, if the issue is ambiguous, or if it is already fixed on `main`, the agent writes `blocked.md` with one question for me and stops. The prompt says that this is a good outcome, not a failure.

**Publish** checks out `main` fresh and takes the agent's commits from a git bundle. That matters because the agent could have rewritten any script in its own job, so nothing it touched runs with the key. The outbox script then checks everything:

- commit messages are conventional and carry `Refs #N`;
- no `Closes` or `Fixes`, because a merge is not a deploy, and I close issues after checking production;
- no file on the protected list;
- at most one open agent PR per issue.

Only then does it push the branch and open the PR.

## The leash

Some paths an agent PR may never touch: `.github/`, `.claude/`, every `CLAUDE.md`, the MCP config, and the agents' own tests. Those are the system's own permissions and checks. Other workflows also run files from there while holding write tokens. Deploy tooling and scripts need a person's explicit approval per issue.

Everything else is fair game, auth and database migrations included. CI and the Opus review are the gate there, and that was a deliberate choice.

The protected list is enforced twice, by the outbox and by a required `agent pr guard` check on every PR. Both read the list from `main`, never from the agent's branch. An agent PR that edits the list can't use its own edit to pass.

The GitHub App itself has no Workflows permission, so GitHub refuses any push that touches a workflow file. It is also not a ruleset bypass actor, so `--admin` merges are impossible.

## The merge gate

Auto-merge was the scary part, so the gate is long and literal. It merges an agent PR only when all of this holds on the PR's current head commit:

- every required CI check passed in its latest run, posted by GitHub Actions itself and not by another app with the same check name;
- the Claude review says Approve, was never edited, and was written by a review job that started after the head was pushed;
- no person with write access has a "Request changes" standing;
- the branch contains `main`'s current tip, and if it doesn't, the gate updates the branch and waits for a fresh review;
- the PR is not on hold, not blocked, and no circuit breaker is tripped.

Then it merges with `--match-head-commit`, pinned to the commit it checked. A push that lands between the checks and the merge doesn't ride along on old evidence.

## Talking to it

Everything that needs me lands in one pinned issue, the inbox. Each request has an ID and a default it falls back to when it expires, which is always the safe choice. I answer by commenting `/approve REQ-12`, `/reject`, `/pause coder`, `/resume coder` or `/rerun coder`. The inbox workflow only listens to my GitHub login.

There are three ways to stop it:

- **Kill switch.** One repository variable, `AGENTS_ENABLED`, and every job checks it before acting.
- **Circuit breaker.** Three failures in a row for a role stops that role and files an inbox request.
- **Hold label.** `agent:hold` on an issue keeps the agents away from it forever.

Every run also writes one JSON line to a ledger branch: role, issue, PR, turns, duration and outcome. That ledger is where the numbers below come from.

## Cron that doesn't fire

One thing I didn't expect: GitHub's scheduler fires this repository's crons late or not at all. Between Friday 22:00 and Saturday 08:05 UTC, the hourly sweep and the hourly merge gate ran twice each, and the daily triage didn't run. Events like CI completions and comments arrive on time. Schedules don't.

So the agent box now runs one systemd timer per scheduled workflow. Each timer dispatches its workflow through the API on the same schedule. The workflows keep their own cron as a backup. A doubled run changes nothing, because every job re-checks the switches and limits anyway, and a test fails if a timer and its cron drift apart.

## The first runs

The ledger so far:

- **#1023**, the CLI printed raw terminal control characters: 85 turns, 14 minutes, a PR that I merged.
- **#832**, an unbounded field in audit rows: 9 turns, 28 seconds, blocked.
- **#960**, another org's registry release could block its app names: 51 turns, 9 minutes, a PR the gate merged.
- **#961**, a restricted member could read proxy logs: 35 turns, 11 minutes, a PR the gate merged.

The first PR I merged by hand on purpose, to watch the whole pipeline once. The blocked run is my favourite. The agent read the code, found the issue was already fixed by an earlier PR, and stopped in 28 seconds with a one-paragraph explanation. That run is why the scheduled pick now skips any issue a merged PR already references.

None of the three PRs needed the fixer. They passed CI and the review on the first try, which says more about the size of the issues than about the agent. These are small, well-specified fixes, and that is exactly the work it is for.

## What it cost to build

About three days and 77 commits to the agent scripts and workflows. Most of the code is shell: about 4,600 lines of scripts and about 4,400 lines of tests for them. The tests pin the contracts between the pieces. The prompt's tool list must equal the workflow's tool list. The protected list must contain `.github/`. The merge gate must refuse a stale Approve. Many of them exist because a review found a way around the rule they pin.

Most of the work went into closing paths I hadn't thought of. Who can add a label. What happens if someone edits an issue after the agent read it. Whether a job beside a PR's CI can reach a key. Whether an old review comment can be edited to say Approve. None of that is about the model. It's about everything around it.

## What's next

The same machinery is meant to run a growth loop. The first two pieces landed today. A weekly collector pulls search, traffic and sign-up numbers. A weekly SEO audit crawls the marketing site and files issues the coder can pick up.

Social posts and outreach emails are designed but not built. The agent will never hold a posting credential. A social post goes out only after one tap from me, and an outreach email lands in my Drafts folder for me to send.

Deploys stay with me too. The agents merge, a deploy ledger tracks what is merged but not yet live, and I decide when production changes.
