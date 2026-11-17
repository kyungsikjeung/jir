param([string]$schemaPath)
$lines = Get-Content $schemaPath
$models = @{}
$currentModel = $null
$modelLines = @{}

# Parse models
$i = 0
while ($i -lt $lines.Count) {
    if ($lines[$i] -match '^model (\w+) \{') {
        $currentModel = $Matches[1]
        $models[$currentModel] = @()
        $modelLines[$currentModel] = @()
        $i++
        while ($i -lt $lines.Count -and $lines[$i] -notmatch '^}') {
            $modelLines[$currentModel] += $lines[$i]
            if ($lines[$i] -match '^\s+(\w+)\s+(\w+)\??\s+@relation\(fields: \[(\w+)\], references: \[id\]') {
                $models[$currentModel] += [PSCustomObject]@{
                    Field = $Matches[1]
                    Target = $Matches[2]
                    FK = $Matches[3]
                }
            }
            $i++
        }
        $i++
    } else {
        $i++
    }
}

# Find all reverse relations needed
$reverseNeeded = @{}
foreach ($modelName in $models.Keys) {
    foreach ($rel in $models[$modelName]) {
        $target = $rel.Target
        if (-not $reverseNeeded.ContainsKey($target)) {
            $reverseNeeded[$target] = @()
        }
        $reverseNeeded[$target] += [PSCustomObject]@{
            SourceModel = $modelName
            SourceField = $rel.Field
            FK = $rel.FK
        }
    }
}

# Now add reverse relations to each target model
$newContent = @()
$i = 0
while ($i -lt $lines.Count) {
    $newContent += $lines[$i]
    if ($lines[$i] -match '^model (\w+) \{') {
        $modelName = $Matches[1]
        # Check if this model needs reverse relations
        if ($reverseNeeded.ContainsKey($modelName)) {
            $rels = $reverseNeeded[$modelName]
            # Find existing field names in this model
            $existingFields = @()
            $j = $i + 1
            while ($j -lt $lines.Count -and $lines[$j] -notmatch '^}') {
                if ($lines[$j] -match '^\s+(\w+)') {
                    $existingFields += $Matches[1]
                }
                $j++
            }
            # Add missing reverse relations
            foreach ($rel in $rels) {
                $sourceModel = $rel.SourceModel
                # Pluralize (simple: add 's' or use the field name)
                $reverseFieldName = $sourceModel.ToLower() + "s"
                # Check if already exists
                if ($existingFields -notcontains $reverseFieldName) {
                    # Find the last field before @@map or closing brace
                    # We'll insert after the last non-empty, non-@@ line
                    # For now, just add before the closing brace
                }
            }
        }
    }
    $i++
}

# This approach is getting too complex. Let me just output the needed reverse relations.
foreach ($target in $reverseNeeded.Keys) {
    Write-Host "=== $target needs reverse relations from: ==="
    foreach ($rel in $reverseNeeded[$target]) {
        Write-Host "  - $($rel.SourceModel) (field: $($rel.SourceField))"
    }
}
