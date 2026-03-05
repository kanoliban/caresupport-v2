# Fine-Tuning Pipeline

Training examples graduated from the lesson review process.

## How examples arrive here

1. Corrections enter `lessons.md` live via `self_corrections`
2. Corrections are staged to `staging/reviews/` for audit
3. `review_staging.py graduate` classifies lessons and flags fine-tuning candidates
4. `review_staging.py merge` moves approved candidates to `fine-tuning/examples/{family_id}/`
5. `review_staging.py export-training` (not yet implemented) exports JSONL for fine-tuning

## Directory structure

```
fine-tuning/
├── README.md
└── examples/
    └── {family_id}/       # per-family training examples
        └── *.json         # individual correction exchanges
```

## Export format (planned)

```jsonl
{"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "...corrected response..."}]}
```
