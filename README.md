# Prompts

A personal collection of system prompts, coding standards, and tech stack references that I use across AI tools and projects.

## Linking skills

Link each skill directory individually into every client-specific skills directory.
Do not link the whole `agent-skills/` repository or the whole `skills/` directory
as a single entry, because some clients only scan direct skill directories and do
not expand nested skill collections consistently.

```sh
SOURCE=/Users/reeky/Workspace/Projects/agent-skills/skills
TARGETS="$HOME/.agents/skills $HOME/.cursor/skills $HOME/.claude/skills $HOME/.codex/skills"

find "$SOURCE" -mindepth 2 -maxdepth 2 -type d | while read -r skill; do
  [ -f "$skill/SKILL.md" ] || continue
  name="$(basename "$skill")"

  for target in $TARGETS; do
    mkdir -p "$target"
    ln -sfn "$skill" "$target/$name"
  done
done
```

If a target directory already has an old link that points to the repository root
or to `skills/` itself, remove that aggregate link first and replace it with the
per-skill links above.
