$f = 'c:\Users\Teste\.gemini\antigravity\scratch\jardim-rpg\src\styles\globals.css'
$c = [System.IO.File]::ReadAllText($f)

# 1. Adiciona variáveis CSS ao .dice-float-panel e substitui cores fixas
$old1 = "  border: 1px solid var(--accent-border);`r`n  border-radius: var(--radius-lg);`r`n  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(168, 85, 247, 0.15);`r`n  overflow: hidden;`r`n  animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);`r`n  user-select: none;`r`n}"
$new1 = "  --dice-accent: var(--accent-purple, #6d28d9);`r`n  --dice-accent-glow: rgba(109,40,217,0.35);`r`n  --dice-accent-muted: rgba(109,40,217,0.15);`r`n  border: 1px solid var(--dice-accent);`r`n  border-radius: var(--radius-lg);`r`n  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9), 0 0 20px var(--dice-accent-muted);`r`n  overflow: hidden;`r`n  animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);`r`n  user-select: none;`r`n}"
$c = $c.Replace($old1, $new1)

# 2. .dice-type-btn:hover – usa variavel
$old2 = "  border-color: var(--accent-purple-light);`r`n  color: var(--accent-purple-light);`r`n  transform: translateY(-2px);`r`n  box-shadow: 0 6px 16px rgba(168, 85, 247, 0.15);"
$new2 = "  border-color: var(--dice-accent);`r`n  color: var(--dice-accent);`r`n  transform: translateY(-2px);`r`n  box-shadow: 0 6px 16px var(--dice-accent-muted);"
$c = $c.Replace($old2, $new2)

# 3. .dice-type-btn.selected
$old3 = "  background: rgba(147, 51, 234, 0.25);`r`n  border-color: var(--accent-purple-light);`r`n  color: #fff;`r`n  box-shadow: 0 0 14px rgba(168, 85, 247, 0.35);"
$new3 = "  background: var(--dice-accent-muted);`r`n  border-color: var(--dice-accent);`r`n  color: #fff;`r`n  box-shadow: 0 0 14px var(--dice-accent-glow);"
$c = $c.Replace($old3, $new3)

# 4. .dice-count-badge
$old4 = "  background: var(--accent-purple);"
$new4 = "  background: var(--dice-accent);"
$c = $c.Replace($old4, $new4)

# 5. .dice-qty-btn:hover
$old5 = "  background: rgba(147, 51, 234, 0.2);`r`n  border-color: var(--accent-purple-light);`r`n  color: var(--accent-purple-light);"
$new5 = "  background: var(--dice-accent-muted);`r`n  border-color: var(--dice-accent);`r`n  color: var(--dice-accent);"
$c = $c.Replace($old5, $new5)

# 6. .dice-qty-label
$old6 = "  color: var(--accent-purple-light);`r`n  letter-spacing: 1px;"
$new6 = "  color: var(--dice-accent);`r`n  letter-spacing: 1px;"
$c = $c.Replace($old6, $new6)

# 7. .dice-result-number text-shadow
$old7 = "  text-shadow: 0 0 20px rgba(168, 85, 247, 0.3);"
$new7 = "  text-shadow: 0 0 20px var(--dice-accent-muted);"
$c = $c.Replace($old7, $new7)

# 8. .dice-roll-label
$old8 = "  color: var(--accent-purple-light);`r`n}`r`n`r`n/* Botão rolar */"
$new8 = "  color: var(--dice-accent);`r`n}`r`n`r`n/* Botão rolar */"
$c = $c.Replace($old8, $new8)

# 9. .dice-roll-btn:hover
$old9 = "  background: rgba(147, 51, 234, 0.25);`r`n  border-color: var(--accent-purple-light);`r`n  color: #fff;`r`n  box-shadow: 0 0 16px rgba(168, 85, 247, 0.3);"
$new9 = "  background: var(--dice-accent-muted);`r`n  border-color: var(--dice-accent);`r`n  color: #fff;`r`n  box-shadow: 0 0 16px var(--dice-accent-glow);"
$c = $c.Replace($old9, $new9)

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "CSS patched successfully"
