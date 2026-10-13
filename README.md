# Web3Bridge Solidity — Cohort XV

Class code for the Web3Bridge Cohort XV Solidity sessions.

| Folder | What it is |
| --- | --- |
| [`contracts/`](contracts/) | Foundry project: a Savings Vault built as a diamond ([EIP-2535](https://eips.ethereum.org/EIPS/eip-2535)) |
| `frontend/` | Coming soon |

## Quick start

You need [Foundry](https://book.getfoundry.sh/getting-started/installation) installed.
The libraries are git submodules, so clone with `--recurse-submodules`:

```shell
git clone --recurse-submodules https://github.com/Akanimoh12/Web3Bridge-Solidity-CohortXV.git
cd Web3Bridge-Solidity-CohortXV/contracts
forge build
```

Already cloned without that flag? Run `git submodule update --init --recursive` and build again.

See [`contracts/README.md`](contracts/README.md) for what each contract does and how to deploy it locally.
