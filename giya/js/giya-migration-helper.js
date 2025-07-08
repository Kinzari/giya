// GIYA Session Storage Migration Script
// This script helps identify and migrate old session storage usage

window.GiyaMigration = {

    // Common session storage patterns to find and replace
    patterns: [
        {
            old: /sessionStorage\.getItem\(['"]baseURL['"]\)/g,
            new: 'GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL)',
            description: 'Base URL getter'
        },
        {
            old: /sessionStorage\.setItem\(['"]baseURL['"],\s*([^)]+)\)/g,
            new: 'GiyaSession.set(GIYA_SESSION_KEYS.BASE_URL, $1)',
            description: 'Base URL setter'
        },
        {
            old: /sessionStorage\.getItem\(['"]user_id['"]\)/g,
            new: 'GiyaSession.get(GIYA_SESSION_KEYS.USER_ID)',
            description: 'User ID getter'
        },
        {
            old: /sessionStorage\.setItem\(['"]user_id['"],\s*([^)]+)\)/g,
            new: 'GiyaSession.set(GIYA_SESSION_KEYS.USER_ID, $1)',
            description: 'User ID setter'
        },
        {
            old: /sessionStorage\.getItem\(['"]user_typeId['"]\)/g,
            new: 'GiyaSession.get(GIYA_SESSION_KEYS.USER_TYPE_ID)',
            description: 'User type ID getter'
        },
        {
            old: /sessionStorage\.getItem\(['"]user_firstname['"]\)/g,
            new: 'GiyaSession.get(GIYA_SESSION_KEYS.USER_FIRSTNAME)',
            description: 'User firstname getter'
        },
        {
            old: /sessionStorage\.getItem\(['"]user_lastname['"]\)/g,
            new: 'GiyaSession.get(GIYA_SESSION_KEYS.USER_LASTNAME)',
            description: 'User lastname getter'
        },
        {
            old: /sessionStorage\.getItem\(['"]user_departmentId['"]\)/g,
            new: 'GiyaSession.get(GIYA_SESSION_KEYS.USER_DEPARTMENT_ID)',
            description: 'User department ID getter'
        },
        {
            old: /sessionStorage\.getItem\(['"]selectedPostType['"]\)/g,
            new: 'GiyaSession.get(GIYA_SESSION_KEYS.SELECTED_POST_TYPE)',
            description: 'Selected post type getter'
        },
        {
            old: /sessionStorage\.getItem\(['"]unreadNotifications['"]\)/g,
            new: 'GiyaSession.get(GIYA_SESSION_KEYS.UNREAD_NOTIFICATIONS)',
            description: 'Unread notifications getter'
        }
    ],

    // Utility replacements for common operations
    utilityPatterns: [
        {
            old: /const\s+(\w+)\s*=\s*sessionStorage\.getItem\(['"]user_typeId['"]\)\s*===\s*['"]6['"]/g,
            new: 'const $1 = GiyaUtils.isAdmin()',
            description: 'Admin check'
        },
        {
            old: /const\s+(\w+)\s*=\s*sessionStorage\.getItem\(['"]user_typeId['"]\)\s*===\s*['"]5['"]/g,
            new: 'const $1 = GiyaUtils.isPOC()',
            description: 'POC check'
        },
        {
            old: /sessionStorage\.getItem\(['"]user_typeId['"]\)\s*===\s*['"]6['"]|sessionStorage\.getItem\(['"]user_typeId['"]\)\s*===\s*6/g,
            new: 'GiyaUtils.isAdmin()',
            description: 'Admin check inline'
        },
        {
            old: /sessionStorage\.getItem\(['"]user_typeId['"]\)\s*===\s*['"]5['"]|sessionStorage\.getItem\(['"]user_typeId['"]\)\s*===\s*5/g,
            new: 'GiyaUtils.isPOC()',
            description: 'POC check inline'
        }
    ],

    // API URL patterns
    apiPatterns: [
        {
            old: /\$\{sessionStorage\.getItem\(['"]baseURL['"]\)\}([^`'"]*\.php[^`'"]*)/g,
            new: 'GiyaUtils.buildApiUrl(\'$1\')',
            description: 'API URL builder'
        }
    ],

    // Scan a JavaScript file content for migration opportunities
    scanContent: function(content, filename = 'Unknown') {
        const results = {
            filename,
            issues: [],
            suggestions: []
        };

        // Check for direct sessionStorage usage
        const sessionStorageUsage = content.match(/sessionStorage\.(get|set|remove)Item\(['"][^'"]*['"]\)/g);
        if (sessionStorageUsage) {
            results.issues.push({
                type: 'Direct sessionStorage usage',
                count: sessionStorageUsage.length,
                examples: sessionStorageUsage.slice(0, 3)
            });
        }

        // Check for specific patterns
        [...this.patterns, ...this.utilityPatterns, ...this.apiPatterns].forEach(pattern => {
            const matches = content.match(pattern.old);
            if (matches) {
                results.suggestions.push({
                    description: pattern.description,
                    count: matches.length,
                    examples: matches.slice(0, 2),
                    replacement: pattern.new
                });
            }
        });

        return results;
    },

    // Apply automatic migrations to content
    migrateContent: function(content) {
        let migratedContent = content;
        let changesApplied = [];

        [...this.patterns, ...this.utilityPatterns, ...this.apiPatterns].forEach(pattern => {
            const originalContent = migratedContent;
            migratedContent = migratedContent.replace(pattern.old, pattern.new);

            if (originalContent !== migratedContent) {
                changesApplied.push(pattern.description);
            }
        });

        return {
            content: migratedContent,
            changes: changesApplied
        };
    },

    // Generate a report for a file
    generateReport: function(content, filename) {
        const scanResults = this.scanContent(content, filename);

        console.group(`Migration Report: ${filename}`);

        if (scanResults.issues.length === 0 && scanResults.suggestions.length === 0) {
            console.log('✅ No migration needed - file is already using centralized session storage');
        } else {
            if (scanResults.issues.length > 0) {
                console.warn('⚠️ Issues found:');
                scanResults.issues.forEach(issue => {
                    console.log(`  - ${issue.type}: ${issue.count} occurrences`);
                    issue.examples.forEach(example => {
                        console.log(`    Example: ${example}`);
                    });
                });
            }

            if (scanResults.suggestions.length > 0) {
                console.info('💡 Migration suggestions:');
                scanResults.suggestions.forEach(suggestion => {
                    console.log(`  - ${suggestion.description}: ${suggestion.count} occurrences`);
                    suggestion.examples.forEach(example => {
                        console.log(`    Found: ${example}`);
                        console.log(`    Replace with: ${suggestion.replacement}`);
                    });
                });
            }
        }

        console.groupEnd();
        return scanResults;
    },

    // Utility to check all files in memory (for debugging)
    checkCurrentPage: function() {
        console.group('🔍 Checking current page for migration opportunities');

        // Check inline scripts
        const scripts = document.querySelectorAll('script:not([src])');
        scripts.forEach((script, index) => {
            if (script.textContent.includes('sessionStorage')) {
                this.generateReport(script.textContent, `inline-script-${index + 1}`);
            }
        });

        console.groupEnd();
    }
};

// Usage examples:
console.log('🛠️ GIYA Migration Tools Loaded');
console.log('📋 Available methods:');
console.log('  - GiyaMigration.scanContent(fileContent, filename)');
console.log('  - GiyaMigration.migrateContent(fileContent)');
console.log('  - GiyaMigration.generateReport(fileContent, filename)');
console.log('  - GiyaMigration.checkCurrentPage()');

// Auto-check current page
setTimeout(() => {
    GiyaMigration.checkCurrentPage();
}, 1000);
