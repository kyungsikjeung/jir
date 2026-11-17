$schemaPath = "prisma/schema.prisma"
$lines = Get-Content $schemaPath

# Step 1: Fix UserRole @@id with optional field
$lines = $lines | ForEach-Object {
    if ($_ -match '@@id\(\[userId, roleId, spaceId\]\)') {
        '  @@map("user_roles")'  # placeholder, will fix below
    } else {
        $_
    }
}
# Actually, let's just remove the @@id line and add @id field
$lines = Get-Content $schemaPath
$newLines = @()
$inUserRole = $false
foreach ($line in $lines) {
    if ($line -match '^model UserRole \{') {
        $inUserRole = $true
        $newLines += $line
        $newLines += '  id         String   @id @default(uuid())'
        continue
    }
    if ($inUserRole -and $line -match '^\}') {
        $inUserRole = $false
    }
    if ($inUserRole -and $line -match '@@id\(\[userId, roleId, spaceId\]\)') {
        continue
    }
    $newLines += $line
}
$lines = $newLines

# Step 2: Fix ambiguous relations (models with multiple User refs)
# TestRun
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'assignedTo   User\?    @relation\(fields: \[assignedToId\], references: \[id\]\)') {
        $lines[$i] = '  assignedTo   User?    @relation("testRunAssigned", fields: [assignedToId], references: [id])'
    }
    if ($lines[$i] -match 'createdBy    User\?    @relation\(fields: \[createdById\], references: \[id\]\)' -and $i -gt 520 -and $i -lt 545) {
        $lines[$i] = '  createdBy    User?    @relation("testRunCreated", fields: [createdById], references: [id])'
    }
}
# Baseline
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'approvedBy    User\?    @relation\(fields: \[approvedById\], references: \[id\]\)') {
        $lines[$i] = '  approvedBy    User?    @relation("baselineApproved", fields: [approvedById], references: [id])'
    }
    if ($lines[$i] -match 'createdBy     User\?    @relation\(fields: \[createdById\], references: \[id\]\)' -and $i -gt 660 -and $i -lt 695) {
        $lines[$i] = '  createdBy     User?    @relation("baselineCreated", fields: [createdById], references: [id])'
    }
}
# Review
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'moderator     User\?    @relation\(fields: \[moderatorId\], references: \[id\]\)') {
        $lines[$i] = '  moderator     User?    @relation("reviewModerator", fields: [moderatorId], references: [id])'
    }
    if ($lines[$i] -match 'createdBy     User\?    @relation\(fields: \[createdById\], references: \[id\]\)' -and $i -gt 840 -and $i -lt 875) {
        $lines[$i] = '  createdBy     User?    @relation("reviewCreated", fields: [createdById], references: [id])'
    }
}
# Space createdBy
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'createdBy        User\?    @relation\(fields: \[createdById\], references: \[id\]\)') {
        $lines[$i] = '  createdBy        User?    @relation("spaceCreatedBy", fields: [createdById], references: [id])'
    }
}

# Step 3: Add reverse relation to User for Space.createdBy
# Find the line with "spaceMembers  SpaceMember[]" in User model and add after it
$newLines = @()
$added = $false
foreach ($line in $lines) {
    $newLines += $line
    if (-not $added -and $line -match '  spaceMembers  SpaceMember\[\]') {
        $newLines += '  createdSpaces Space[] @relation("spaceCreatedBy")'
        $added = $true
    }
}
$lines = $newLines

# Step 4: Add reverse relations for all other missing ones
# Organization -> roles
$newLines = @()
$added = $false
foreach ($line in $lines) {
    $newLines += $line
    if (-not $added -and $line -match '  users     User\[\]') {
        $newLines += '  roles     Role[]'
        $added = $true
    }
}
$lines = $newLines

# Role -> spaceMembers
$newLines = @()
$added = $false
foreach ($line in $lines) {
    $newLines += $line
    if (-not $added -and $line -match '  userRoles   UserRole\[\]') {
        $newLines += '  spaceMembers SpaceMember[]'
        $added = $true
    }
}
$lines = $newLines

# Space -> userRoles
$newLines = @()
$added = $false
foreach ($line in $lines) {
    $newLines += $line
    if (-not $added -and $line -match '  members          SpaceMember\[\]') {
        $newLines += '  userRoles        UserRole[]'
        $added = $true
    }
}
$lines = $newLines

Set-Content -Path prisma/schema.prisma -Value $lines
Write-Host "Done"
