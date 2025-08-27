# Deploy Email Functions to Supabase
Write-Host "🚀 Deploying GuestGlow Email Functions..." -ForegroundColor Green

# Link to the correct project
Write-Host "🔗 Linking to GuestGlow-AI-Platform..." -ForegroundColor Yellow
supabase link --project-ref wzfpltamwhkncxjvulik

# Deploy all email functions
$functions = @(
    "send-tenant-emails",
    "generate-feedback-emails", 
    "send-feedback-link",
    "thank-you-generator",
    "scheduled-email-reports",
    "email-scheduler",
    "email-queue",
    "email-analytics",
    "schedule-detailed-thankyou",
    "process-email-queue"
)

foreach ($func in $functions) {
    Write-Host "📤 Deploying $func..." -ForegroundColor Cyan
    supabase functions deploy $func
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy $func" -ForegroundColor Red
    }
}

Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Set RESEND_API_KEY in Supabase Dashboard" -ForegroundColor White
Write-Host "2. Test the functions using test-email-system.html" -ForegroundColor White
Write-Host "3. Verify emails are received at g.basera5@gmail.com" -ForegroundColor White
