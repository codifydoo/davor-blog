---
title: Terraform state is a liability
date: 2026-09-21T10:00:00+02:00
number: 37
tags: [infrastructure, security]
lang: en
description: "The state file holds every secret your infrastructure touches, in plain text. How I store it, split it and keep secrets out of it."
---

At work I spend a lot of time with Terraform. The configuration gets reviewed, linted and argued about. The state file, which is the more dangerous artefact, mostly gets ignored until something goes wrong.

## What is in the state

Terraform state is a JSON record of every resource it manages and every attribute the provider returned. That includes things you never wrote in the configuration:

- Database passwords, if you set them through Terraform.
- Generated values: random passwords, private keys from `tls_private_key`, access keys for service accounts you created.
- Anything read through a data source, including secrets fetched from a secret manager.

Marking a variable or output as `sensitive` hides it from plan output. It does not encrypt it in the state. The value is still there in plain text for anyone who can read the file.

So the state file deserves the same care as the secrets inside it. In practice it often gets less.

## Store it like a secret

Local state on a laptop is out. So is state committed to Git, which I still find in repositories more often than I would like. Remote state in an object store is the baseline, with:

- Encryption at rest, with a key whose access you control.
- Versioning, so a bad apply or a corrupted write can be rolled back.
- Locking, so two applies never write at the same time.
- Access limited to the CI role that runs applies and a small group of people. Read access to state is read access to every secret in it.

```hcl title="backend.tf"
terraform {
  backend "s3" {
    bucket       = "example-tfstate"
    key          = "network/prod.tfstate"
    region       = "eu-central-1"
    encrypt      = true
    kms_key_id   = "alias/tfstate"
    use_lockfile = true
  }
}
```

`use_lockfile` locks with a small object in the same bucket, using S3 conditional writes, so there is no separate DynamoDB table to look after. Older setups use the table for the same job.

OpenTofu can also encrypt state on the client before it is written anywhere. That closes the gap where the storage provider, or anyone with read access to the bucket, sees plain text.

## Keep secrets out of it

The better fix is not to have the secret in state at all.

- Let the service create its own credentials where it can. Many managed databases can keep and rotate the admin password in the provider's secret manager, and Terraform only ever sees a reference to it.
- Give secrets to workloads at runtime, from the secret manager, instead of reading them in Terraform and passing them along.
- Recent Terraform versions have ephemeral values and write-only arguments. They are used during an apply and never written to state. Where a provider supports them, use them.

## Split it

One state for everything means every apply can touch everything, and everyone who runs applies can read everything. I split by blast radius and by who needs access:

- Network and DNS change rarely and need few people.
- Each application environment gets its own state and its own CI role.
- Identity and access gets its own state and the smallest group of all.

Splitting has a cost. Values have to cross between states. I prefer data source lookups by name or tag over reading another state's outputs, because then one state never needs read access to another. Moving a resource between states used to mean hand-editing state. Now it is a `removed` block in one configuration and an `import` block in the other, both visible in a normal plan.

## Watch it

Treat state access like any other sensitive access. Log reads of the bucket, alert on reads from anything other than the CI role, and review who has access every quarter. A leaked state file is a credential leak and should be handled like one: rotate everything in it.

To see what a state actually holds, look for attribute names that smell like secrets:

```bash title="audit.sh"
terraform state pull | jq -r '
  .resources[].instances[].attributes
  | to_entries[]
  | select(.key | test("password|secret|private_key|token"; "i"))
  | .key' | sort | uniq -c
```

The configuration describes what you want. The state records what you have, including every secret along the way. Review the first. Lock down the second.
