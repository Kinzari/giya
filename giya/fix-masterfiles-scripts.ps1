# PowerShell script to fix masterfiles HTML script includes

$masterfilesDir = "d:\CODING\project giya\giya\dashboard\masterfiles"
$htmlFiles = Get-ChildItem -Path $masterfilesDir -Filter "*.html"

$correctScriptOrder = @"
    <!-- Scripts -->
    <script src="../../js/config.js"></script>
    <script src="../../js/giya-session-utils.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/2.2.2/js/dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/2.2.2/js/dataTables.bootstrap5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>
    <script src="../../js/dashboard/poc-restrictions.js"></script>
    <script src="../../js/masterfiles/MasterTable.js"></script>
"@

foreach ($file in $htmlFiles) {
    $filename = $file.Name
    $jsFile = $filename -replace "\.html$", ".js"

    Write-Host "Processing $filename..."

    # Read the file content
    $content = Get-Content -Path $file.FullName -Raw

    # Extract the JavaScript file specific to this masterfile
    $specificJsLine = "    <script src=`"../../js/masterfiles/$jsFile`"></script>"

    # Create the complete script section for this file
    $newScriptSection = $correctScriptOrder + "`n" + $specificJsLine + "`n</body>`n`n</html>"

    # Replace everything from "<!-- Scripts -->" to the end of the file
    $updatedContent = $content -replace "(?s)<!-- Scripts -->.*$", $newScriptSection

    # Write the updated content back to the file
    Set-Content -Path $file.FullName -Value $updatedContent -NoNewline

    Write-Host "Fixed $filename"
}

Write-Host "All masterfiles HTML files have been updated!"
