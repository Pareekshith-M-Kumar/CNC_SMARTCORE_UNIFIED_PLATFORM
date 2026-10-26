# ============================================================================
# setup_3_databases.ps1 - Automated 3-Database Provisioning Script
# Creates and populates:
#   1. cnc_m1_db      (Module 1 Shop-Floor Monitoring)
#   2. cnc_m2_db      (Module 2 Pre-Manufacturing Platform)
#   3. cnc_unified_db (Unified Platform: Identity, Registration, Orders, Assets)
# ============================================================================

param (
    [string]$PgHost = "localhost",
    [int]$PgPort = 5432,
    [string]$PgUser = "postgres",
    [string]$PgPassword = "postgres"
)

$env:PGPASSWORD = $PgPassword
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CNC SmartCore: Initializing 3 Separate Enterprise Databases" -ForegroundColor Cyan
Write-Host "Host: $PgHost:$PgPort | User: $PgUser" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

function Execute-SqlFile {
    param (
        [string]$DbName,
        [string]$SqlFilePath
    )

    Write-Host "`n--> Initializing Database: $DbName..." -ForegroundColor Yellow

    # Check if database exists, create if not
    $checkDb = & psql -h $PgHost -p $PgPort -U $PgUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'" 2>$null
    if ($checkDb -ne "1") {
        Write-Host "    Creating database '$DbName'..." -ForegroundColor Green
        & psql -h $PgHost -p $PgPort -U $PgUser -d postgres -c "CREATE DATABASE $DbName;" 2>$null
    } else {
        Write-Host "    Database '$DbName' already exists." -ForegroundColor Gray
    }

    # Execute schema & seed script
    Write-Host "    Applying schema from $(Split-Path -Leaf $SqlFilePath)..." -ForegroundColor Green
    & psql -h $PgHost -p $PgPort -U $PgUser -d $DbName -f $SqlFilePath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [SUCCESS] $DbName schema initialized successfully!" -ForegroundColor Green
    } else {
        Write-Host "    [WARNING] Error or notices during $DbName initialization." -ForegroundColor Red
    }
}

# 1. Module 1 Database
Execute-SqlFile -DbName "cnc_m1_db" -SqlFilePath (Join-Path $scriptDir "01_init_m1_db.sql")

# 2. Module 2 Database
Execute-SqlFile -DbName "cnc_m2_db" -SqlFilePath (Join-Path $scriptDir "02_init_m2_db.sql")

# 3. Unified Identity & Lifecycle Database
Execute-SqlFile -DbName "cnc_unified_db" -SqlFilePath (Join-Path $scriptDir "03_init_unified_db.sql")

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "3-Database Setup Complete!" -ForegroundColor Cyan
Write-Host "  1. cnc_m1_db:      jdbc:postgresql://$PgHost`:$PgPort/cnc_m1_db" -ForegroundColor White
Write-Host "  2. cnc_m2_db:      jdbc:postgresql://$PgHost`:$PgPort/cnc_m2_db" -ForegroundColor White
Write-Host "  3. cnc_unified_db: jdbc:postgresql://$PgHost`:$PgPort/cnc_unified_db" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
