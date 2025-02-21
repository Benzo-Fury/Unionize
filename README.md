<style>
  .emoji{
    width: 24px; 
    height: 24px; 
    vertical-align: middle; 
    margin-left: 2px;
  }
</style>

<div align="center">
  <img src="
  https://raw.githubusercontent.com/Benzo-Fury/Unionize/main/public/images/banner.png
  " width="900px" style="border-radius: 20px;">
  <h1>A Better Marriage Bot</h1>
  <h4>A free to use, modern Discord bot for creating family's within Discord</h4>
</div>

<div align="center" styles="margin-top: 10px">
<img src="https://img.shields.io/badge/open-source-brightgreen" />
<a href="https://wakatime.com/badge/user/562ef0a6-af5f-4e3d-b92f-23fc331558ea/project/69edc26a-4fb3-4b79-8034-1e42674f983c"><img src="https://wakatime.com/badge/user/562ef0a6-af5f-4e3d-b92f-23fc331558ea/project/69edc26a-4fb3-4b79-8034-1e42674f983c.svg" alt="wakatime"></a>
<img src="https://img.shields.io/badge/built_with-sern-pink?labelColor=%230C3478&color=%23ed5087&link=https%3A%2F%2Fsern.dev"/>
</div>

## Table Of Contents

- [Technical](#technical-️)
  - [sern Handler ](#sern-handler-)
  - [Databases ](#databases-)
    - [Neo4j ](#neo4j-)
    - [Mongodb ](#mongodb-)
  - [Graphing](#graphing-)
  - [Versioning](#versioning)
    - [Usable Flags](#usable-flags)
- [Usage Docs](#usage-docs)
  - [Proposals ](#proposals-)
    - [Lifetime](#lifetime)
  - [Incest Levels](#incest-levels-)
- [Future Plans](#-future-plans)
  - [Database \& Query Improvements](#-database--query-improvements)
  - [Relationship \& Interaction Features](#️-relationship--interaction-features)
  - [Seasonal Events \& Special Commands](#-seasonal-events--special-commands)
  - [Command \& System Enhancements](#️-command--system-enhancements)
  - [Premium Features](#-premium-features)


## Why?

- Supports poly relationships.
- Modern & Minimalistic 
- Made for speed

<!--
## Competitor Comparison

Have a table here with each major competitor and what their capable of and what we do better.
-->

# Technical 🛠️

## sern Handler <img src="https://raw.githubusercontent.com/Benzo-Fury/Unionize/main/public/images/sern.png" class="emoji">

Unionize has been written using the latest version of the [sern](https://sern.dev) bot framework. I've been a supporter of this framework for years and I highly recommend them for your next bot.

## Databases <img src="https://raw.githubusercontent.com/Benzo-Fury/Unionize/main/public/images/database.png" class="emoji">

Unionize runs 2 databases consecutively for different purposes. Neo4j is used to store relationships between users and MongoDB is used for everything else.

### Neo4j <img src="https://raw.githubusercontent.com/Benzo-Fury/Unionize/main/public/images/Neo4j.png" class="emoji">

**Modules will never access the N4j client directly** and therefor never handle or use cypher. All commands use the models created for them (N4jUser, N4jGuild, etc) or interact with the data interpreter.

### Mongodb <img src="https://raw.githubusercontent.com/Benzo-Fury/Unionize/main/public/images/Mongodb.png" class="emoji" style="margin-bottom:3px">

Our use of MongoDB is less strict due to its already strong model like ecosystem. This allows commands to interact with the DB via these models.

## Graphing 📊

Family trees can be viewed with the `/tree` command. At the point of writing this, this command uses graphviz to render a pretty bad looking but great functionality graph. In future this will use D3 and a headless browser and look something like:

<img src="https://cdn.discordapp.com/attachments/1123486166948270120/1304077701631578133/frame_1.png?ex=67ab5300&is=67aa0180&hm=2999947a912a7e80a2e6eeea3e7f8021049e5260bd17bb5db45455feaa9efcbb&" style="border-radius: 20px; max-width: 50%; height: auto;">

## Versioning

Unionize uses **semantic versioning** along with **pre release labels**. The format is followed:

```
{flag}-{major}.{minor}.{hotfix}
```

### Usable Flags

| **Version Name**    | **Flag** | **Description**                                                       |
| ------------------- | -------- | --------------------------------------------------------------------- |
| `stable`            | `s`      | Fully tested and production-ready release.                            |
| `alpha`             | `a`      | Early development version, unstable and may contain breaking changes. |
| `beta`              | `b`      | Feature-complete but may still contain bugs.                          |
| `release candidate` | `rc`     | Nearly stable but requires final testing.                             |

# Usage Docs

## Proposals <img src="https://raw.githubusercontent.com/Benzo-Fury/Unionize/main/public/images/heart.png" class="emoji">

### Lifetime

The lifetime of a proposal will work as followed:

```mermaid
graph TD;
    proposalCreated(Proposal created)
    proposalDenied(Proposal is auto-denied)
    proposalDeleted(Proposal deleted)


    proposalCreated-->|Wait 48hrs|isResponse{{Has there been a response?}}
    isResponse-->yes & no

    yes-->|Wait 48 hrs|proposalDeleted
    no-->proposalDenied

    proposalDenied-->|Wait 48 hrs|proposalDeleted
```

## Incest Levels 👬

Use this table to understand what IL correlates to what relationships. Keep in mind only premium users can modify their IL.
| **IL Level** | **Allowed Relationships** | **Examples** |
|-------------|--------------------------|-------------|
| **0** (Strict) | No relatives at all | Only completely unrelated people can marry |
| **1** | Distant cousins (8th+ cousin, removed) | `"8th cousin 2 times removed"` |
| **2** | Moderate cousins (5th+ cousin) | `"5th cousin"`, `"5th cousin 1 time removed"` |
| **3** | Close cousins (3rd+ cousin) | `"3rd cousin"`, `"4th cousin"` |
| **4** | First cousins allowed | `"1st cousin"` |
| **5** | Sibling of spouse, grandnieces/nephews | `"niece/nephew"`, `"aunt/uncle"` |
| **6** | Siblings allowed | `"sibling"` |
| **7** | Parent-child, grandparent-grandchild allowed | `"parent"`, `"grandparent"` |

# 🚀 Future Plans

> These are ideas and planned features that are **likely** to be implemented but are **not yet confirmed**.

## 🔹 Database & Query Improvements

- Convert **predefined Cypher files** into **dynamically generated Cypher queries** in JavaScript.

  - Allows more flexible queries without needing to specify `ON CREATE` parameters every time.
  - Improves performance and adaptability.

- Future **command execution** should prioritize **models over the Neo4j Data Interpreter**:
  - A refined plugin should create **models** for the user executing the command.
  - These models will be accessible via **state** and have methods for easier data interaction.
  - Reduces dependency on direct database queries.

## ❤️ Relationship & Interaction Features

- **Love Levels**

  - Users will have **love levels** with anyone they are related to (directly or indirectly).
  - Love levels will be stored in a **MongoDB collection**.
  - Some **interact commands** may be **partner-only**.
  - **Love Level Decay**:
    - Love levels **slowly decrease** over time.
    - Decay rate can be **customized** (`/set-decay-rate`)—potentially a **premium feature**.
  - Love levels will affect **certain commands** (e.g., `/kiss` animations change based on love level).

- **Memory Book / Relationship Milestones**

  - Keeps track of key events like:
    - First kisses 💋
    - Adoptions 🏡
    - Marriage anniversaries 💍
  - This could be a **premium-only** feature.

- **Memories Feature (like Facebook Memories?)**

  - Sends reminders like:
    - `"It's your 3-month anniversary!"` 🎉
    - `"You've been married for 6 months!"` 🥳
    - Or a command `/relation-length` that checks how long you've had a relationship with a specified user.
      - Changes response or adds different emojis dependant on the relation.
  - Could be sent via **DMs** or appear when using relevant commands.
  - Possibly a **premium-only** feature.

- **Daily Challenges**
  - Example: `"Hug 3 members in your tree today!"`
  - Completing challenges could **increase love level** or earn **bonus rewards**.

## 🎉 Seasonal Events & Special Commands

- Introduce **seasonal or limited-time events**:
  - 🎃 **Halloween:** `/carve-pumpkin`
  - 🎄 **Christmas:** `/decorate-tree`
  - 💖 **Valentine’s Day:** Love level boosts
  - These events could **boost love levels** and encourage user engagement.

## 🛠️ Command & System Enhancements

- Implement **cooldowns** on certain commands.
- Determine if **premium features** should be **per-user or per-guild**.
  - If per-guild, admins could use `/set-decay-rate` for global settings.

## 🔹 Premium Features

- **Higher traversal depth** for **family trees**.
- **Lower decay rate** for **love levels**.
- **Exclusive seasonal events and memories.**

## Other
- Remove the language manager from global namespace. 
