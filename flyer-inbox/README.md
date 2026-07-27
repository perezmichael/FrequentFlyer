# Flyer inbox

Drop flyer images here, then run:

```bash
node scripts/upload-flyers.mjs
```

The script uploads each file to the `event-flyers` bucket and attaches it to the
matching event. Images in this folder are gitignored — only this README is
tracked, so nothing large or rights-encumbered lands in a public repo.

## Naming

The basename before the extension is the key. Extension can be `.png`, `.jpg`,
`.jpeg` or `.webp` — the script sniffs the real type from the file's magic bytes
rather than trusting the name.

| Filename (any image extension) | Attaches to |
|---|---|
| `girls-build-night` | Girls* Build Night — Jul 31 |
| `chirla-benefit` | Free Benefit Show for CHIRLA — Jul 31 |
| `canyon-sundays` | All four Canyon Sunday Pop-Ups — Aug 2, 9, 16, 23 |
| `welcome-home` | welcome home! — Aug 22 |
| `singles-party` | Singles Party: Lesbian Edition — Jul 30 |

Anything else in the folder is reported and skipped, never guessed at.

Re-running is safe: a key that already has a flyer is overwritten with the new
file, so fixing a bad crop just means dropping a better file and running again.
