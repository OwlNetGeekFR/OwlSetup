# Normalisation du CSS pour les assertions de test.
#
# styles.css est genere par beta/scripts/build-css.mjs a partir de partiels
# formates : la mise en forme (retours a la ligne, espaces, zeros de tete) peut
# changer sans que le style change. Les tests doivent donc comparer le CONTENU
# des regles, pas leur presentation.
#
# La normalisation ramene le CSS a la forme compacte, celle dans laquelle les
# motifs attendus des tests ont ete ecrits. Elle est idempotente : on peut
# l'appliquer au CSS comme au motif.
#
# Les commentaires sont CONSERVES : certains tests verifient leur presence ou
# leur position (ordre des blocs).
#
# ASCII uniquement : PowerShell 5.1 decode mal les accents dans un .ps1 sans BOM.

function ConvertTo-CssComparable {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text)

    $t = $Text
    $t = [regex]::Replace($t, '\s+', ' ')                       # espaces -> une seule
    $t = [regex]::Replace($t, '\(\s+', '(')
    $t = [regex]::Replace($t, '\s+\)', ')')
    $t = [regex]::Replace($t, '\s*!\s*important', '!important')
    $t = [regex]::Replace($t, '(@[a-z-]+)\s+\(', '$1(')         # @media ( -> @media(
    # Operateurs arithmetiques de calc(). Les gardes evitent de toucher aux
    # delimiteurs de commentaire /* et */, ou l'operateur borde un espace.
    $t = [regex]::Replace($t, '(?<=[\w%)])\s*([*/])\s*(?=[\w(.])', '$1')
    $t = [regex]::Replace($t, ';\s*}', '}')                     # dernier point-virgule
    $t = [regex]::Replace($t, '\s*([{}:;,>+~])\s*', '$1')       # ponctuation CSS
    $t = [regex]::Replace($t, '(\W)0\.(\d)', '$1.$2')           # 0.5 -> .5
    return $t.Trim()
}

# Verifie que $Css contient $Token, a la mise en forme pres.
function Assert-CssContains {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Css,
        [Parameter(Mandatory = $true)][string]$Token,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if (-not (ConvertTo-CssComparable $Css).Contains((ConvertTo-CssComparable $Token))) {
        throw $Message
    }
}
