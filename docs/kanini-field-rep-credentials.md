# Kanini Field — Rep sign-in credentials

Issued 2026-09-03. All accounts are on the Nice OS census project
(`zsprlozgdxzxeevvetmg`). Every rep should sign in with their personal email
below and the matching password. Passwords are 8-char strong combos
(upper + lower + digit + symbol).

> SECURITY: This file contains plaintext passwords. Keep it private — do not
> push it to a public repo, and rotate passwords if this file is ever exposed.

| Rep | Sign-in email | Password | Zone |
|---|---|---|---|
| Erick Kyalo | `kyalo@kaninifield.co.ke` | `%C^djH4Q` | Kiambu — Kabete/Kikuyu |
| Peter Owuor | `owuor@kaninifield.co.ke` | `lTE&n0$o` | Kiambu — Thika Town/Ruiru |
| Evans Mutune | `mutune@kaninifield.co.ke` | `yBg7x1&H` | Kiambu — Juja/Gatundu South |
| Nicole Githui | `githui@kaninifield.co.ke` | `M&9o%G9&` | Kiambu — Kiambu/Kiambaa |
| Nelius | `nelius@kaninifield.co.ke` | `%n8$*HUA` | Kiambu — Limuru/Lari |
| Willys Munyanga | `munyanga@kaninifield.co.ke` | `&G76z#84` | Kiambu — Gatundu North/Githunguri |

## Notes
- Emails changed from the legacy `@niceos.co.ke` / `@marketlink.co.ke` to
  `@kaninifield.co.ke` across all three identity stores (`auth.users`, `reps`,
  `profiles`) and kept in sync.
- Passwords are hashed at rest by Supabase GoTrue with **bcrypt**. Managed
  Supabase auth does not allow swapping in a custom hashing algorithm; changing
  that would require building a custom auth service and is not recommended.
- If a rep can't sign in, check they are entering the personal `@kaninifield.co.ke`
  email (not their old one) and the exact password above.
