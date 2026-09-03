# Learning & Growth Agent

Phase 1, Week 2. Multi-track: technical (AI/IT/DSA/System Design/Cloud & DevOps) first. English vocabulary, personality development, and entrepreneurship tracks come later (Phase 2), once the daily-lesson mechanism is proven on one track.

## Content sourcing — important design constraint

The vault is an input, not a ceiling. Don't build this as "read the vault, turn it into lessons" — the agent proposes topics and builds lessons from its own general knowledge (and web research for anything current) on its own initiative, not blocked by an empty or thin vault folder.

**Do not use vault note presence as a proxy for "already learned."** A note existing under `Atlas/Dots/Concepts/` doesn't mean the topic is mastered — could be an unread clip, a skim, a stale reference. There's no reliable signal there. "Already taught this" comes from the agent's own progress state (topics completed, scores, weak areas, revision needs — memory/ once that's built), tracked from lessons the agent has actually delivered and problems the user has actually solved. That's the real completion signal, not vault-scanning.

The vault's actual roles here: (1) weight the user's own uploaded/trusted sources when building a lesson on a topic that has them, (2) be the place the agent writes its own lesson notes and progress logs back to — reliable *after* the agent starts writing there, not before. For pre-existing notes that predate this agent, treat them as worth asking about ("I see notes on X — comfortable with it already, or start there?"), never as assumed prior mastery.

Not started.
